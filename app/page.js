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
      console.log('Bucket: tree-photos')
      console.log('File name:', fileName)
      console.log('File type:', file.type)
      console.log('File size:', file.size)
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

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '1rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.8rem' }}>🌲 Canopy</h1>
        <button onClick={() => setShowModal(true)} style={{ background: '#4a6741', color: 'white', border: 'none', borderRadius: 20, padding: '8px 18px', cursor: 'pointer', fontSize: 14 }}>
          + Share a tree
        </button>
      </div>

      {loading && <p>Loading trees...</p>}
      {!loading && posts.length === 0 && <p>No trees yet — be the first to share one!</p>}

      {posts.map(post => (
        <div key={post.id} style={{ background: 'white', borderRadius: 12, border: '1px solid #eee', marginBottom: '1.5rem', overflow: 'hidden' }}>
          <img src={post.image_url} alt="Tree" style={{ width: '100%', height: 300, objectFit: 'cover', display: 'block' }} />
          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong>{post.author}</strong>
              {post.species && <span style={{ background: '#dcefd8', color: '#3b6d11', borderRadius: 20, padding: '2px 10px', fontSize: 12 }}>{post.species}</span>}
            </div>
            {post.caption && <p style={{ margin: '0 0 6px', fontSize: 14 }}>{post.caption}</p>}
            {post.location && <p style={{ margin: 0, fontSize: 12, color: '#888' }}>📍 {post.location}</p>}
          </div>
        </div>
      ))}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 440 }}>
            <h2 style={{ marginTop: 0 }}>Share a Tree</h2>

            {!preview ? (
              <label style={{ display: 'block', border: '2px dashed #a8c89a', borderRadius: 12, padding: '2rem', textAlign: 'center', cursor: 'pointer', marginBottom: '1rem', background: '#f0f7ee' }}>
                <div style={{ fontSize: '2rem' }}>📷</div>
                <p style={{ margin: '8px 0 0', fontSize: 13, color: '#666' }}>Click to upload a photo</p>
                <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
              </label>
            ) : (
              <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <img src={preview} style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 10, display: 'block' }} />
                <button onClick={() => { setFile(null); setPreview(null) }} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer' }}>✕</button>
              </div>
            )}

            {['author', 'caption', 'location'].map(field => (
              <input key={field} placeholder={field.charAt(0).toUpperCase() + field.slice(1)} value={form[field]}
                onChange={e => setForm({ ...form, [field]: e.target.value })}
                style={{ display: 'block', width: '100%', marginBottom: 10, padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }} />
            ))}

            <select value={form.species} onChange={e => setForm({ ...form, species: e.target.value })}
              style={{ display: 'block', width: '100%', marginBottom: 16, padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}>
              <option value="">Select species...</option>
              {['Oak','Maple','Pine','Birch','Willow','Cherry','Sequoia','Elm','Cedar','Beech','Other'].map(s => <option key={s}>{s}</option>)}
            </select>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSubmit} disabled={uploading} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#3d2b1f', color: 'white', cursor: 'pointer' }}>
                {uploading ? 'Sharing...' : 'Share Tree'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
