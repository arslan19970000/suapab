// app/cart/page.tsx (or wherever your CartPage lives)
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function CartPage() {
  const [cart, setCart] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchCart = async () => {
      const { data: user } = await supabase.auth.getUser()
      if (!user?.user) return
      const { data } = await supabase
        .from('carts')
        .select('id, quantity, products(id, name, price, image_url)')
        .eq('user_id', user.user.id)
      setCart(data || [])
      setLoading(false)
    }
    fetchCart()
  }, [])

  const updateQuantity = async (id: string, qty: number) => {
    if (qty < 1) return
    await supabase.from('carts').update({ quantity: qty }).eq('id', id)
    setCart(cart.map((c) => (c.id === id ? { ...c, quantity: qty } : c)))
  }

  const removeItem = async (id: string) => {
    await supabase.from('carts').delete().eq('id', id)
    setCart(cart.filter((c) => c.id !== id))
  }

  const total = cart.reduce((sum, item) => sum + item.quantity * item.products.price, 0)

  const handleCheckout = async () => {
    if (cart.length === 0) return alert('Your cart is empty!')
    setProcessing(true)

    const { data: user } = await supabase.auth.getUser()
    if (!user?.user) {
      setProcessing(false)
      return alert('Please log in to checkout')
    }

    // Prepare minimal items for server (avoid trusting client prices in real apps)
    const items = cart.map((c) => ({
      product_id: c.products.id,
      name: c.products.name,
      price: c.products.price,       // cents conversion happens on server
      quantity: c.quantity,
      image_url: c.products.image_url || null,
      cart_id: c.id
    }))

    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.user.id,
        items
      })
    })

    if (!res.ok) {
      setProcessing(false)
      return alert('Failed to start checkout')
    }

    const { url } = await res.json()
    window.location.href = url // redirect to Stripe
  }

  if (loading) return <p>Loading cart...</p>

  return (
    <div className="space-y-4">
      {cart.length > 0 ? (
        <>
          {cart.map((item) => (
            <div key={item.id} className="flex items-center justify-between border p-4 rounded-lg gap-4">
              {item.products.image_url && (
                <img src={item.products.image_url} alt={item.products.name} className="w-20 h-20 object-cover rounded" />
              )}
              <div className="flex-1">
                <p className="font-semibold">{item.products.name}</p>
                <p className="text-sm text-gray-500">${item.products.price.toFixed(2)} each</p>
                <p className="text-sm font-medium text-gray-700">
                  Total: ${(item.products.price * item.quantity).toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-2 py-1 border rounded">-</button>
                <span>{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-2 py-1 border rounded">+</button>
              </div>
              <button onClick={() => removeItem(item.id)} className="text-red-600 hover:underline">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          <div className="flex justify-between font-bold text-lg border-t pt-4">
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={processing}
            className="mt-4 w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
          >
            {processing ? 'Processing...' : 'Checkout'}
          </button>
        </>
      ) : (
        <p className="text-center text-gray-500">Your cart is empty.</p>
      )}
    </div>
  )
}
