'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ author: '', species: '', caption: '', location: '' })
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)

  useEffect(() => { fetchPosts() }, [])

  async function fetchPosts() {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
    setPosts(data || [])
    setLoading(false)
  }

  function handleFile(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

 async function handleSubmit() {
  if (!file) return alert('Please pick a photo!')
  if (!form.caption && !form.species) return alert('Add a caption or species!')
  setUploading(true)

  try {
    const ext = file.name.split('.').pop().toLowerCase()
    const fileName = `${Date.now()}.${ext}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('tree-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      })

    if (uploadError) {
      alert('Upload failed: ' + JSON.stringify(uploadError))
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('tree-photos')
      .getPublicUrl(uploadData.path)

    await supabase.from('posts').insert({
      author: form.author || 'Anonymous',
      species: form.species,
      caption: form.caption,
      location: form.location,
      image_url: urlData.publicUrl,
    })

    setForm({ author: '', species: '', caption: '', location: '' })
    setFile(null)
    setPreview(null)
    setShowModal(false)
    setUploading(false)
    fetchPosts()
  } catch (err) {
    alert('Error: ' + err.message)
    setUploading(false)
  }
}
