'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast, { Toaster } from 'react-hot-toast'

export default function BuyerProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data: user } = await supabase.auth.getUser()
        setUserId(user.user?.id ?? null)

        const { data: productsData, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error

        setProducts(productsData || [])
      } catch (err: any) {
        console.error('Error fetching products:', err.message)
        showConfirmation('Failed to load products')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  // Custom confirmation popup with OK and Cancel
  const showConfirmation = (message: string, onConfirm: () => void) => {
    toast(
      t => (
        <div className="flex flex-col items-center p-4">
          <p className="mb-3">{message}</p>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                toast.dismiss(t.id)
                onConfirm()
              }}
              className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              OK
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-4 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      { duration: Infinity } // stays until user clicks
    )
  }

  const addToCart = async (productId: string) => {
    if (!userId) {
      showConfirmation('Please login to add to cart', () => {})
      return
    }

    showConfirmation('Do you want to add this item to your cart?', async () => {
      try {
        const { data: existing } = await supabase
          .from('carts')
          .select('*')
          .eq('user_id', userId)
          .eq('product_id', productId)
          .single()

        if (existing) {
          await supabase
            .from('carts')
            .update({ quantity: existing.quantity + 1 })
            .eq('id', existing.id)
          toast.success('Quantity updated in cart')
        } else {
          await supabase.from('carts').insert({
            user_id: userId,
            product_id: productId,
            quantity: 1
          })
          toast.success('Added to cart')
        }
      } catch (err: any) {
        console.error('Add to cart error:', err.message)
        toast.error('Failed to add to cart')
      }
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading products...</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <Toaster position="top-center" reverseOrder={false} />

      <h1 className="text-2xl font-semibold mb-4">Products</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products.map(product => (
          <div key={product.id} className="border p-4 rounded bg-white shadow-sm">
            {product.image_url && (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-48 object-cover rounded mb-3"
              />
            )}
            <h2 className="font-semibold">{product.name}</h2>
            <p className="text-gray-600">${product.price}</p>
            <p className="text-sm text-gray-500">Stock: {product.stock}</p>
            <button
              onClick={() => addToCart(product.id)}
              className="mt-3 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
