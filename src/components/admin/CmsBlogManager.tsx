import { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Plus, X, Edit2, Trash2, Save, Eye, EyeOff } from "lucide-react";

const inputClass = "w-full bg-secondary border border-border rounded-md px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function CmsBlogManager() {
  const [posts, setPosts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", slug: "", content: "", excerpt: "", image_url: "", tags: "", status: "draft" });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchPosts = () =>
    apiClient.from("blog_posts" as any).select("*").order("created_at", { ascending: false })
      .then(({ data }) => setPosts((data as any[]) || []));

  useEffect(() => { fetchPosts(); }, []);

  const resetForm = () => setForm({ title: "", slug: "", content: "", excerpt: "", image_url: "", tags: "", status: "draft" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = form.slug || slugify(form.title);
    const { data: { session } } = await apiClient.auth.getSession();
    const { error } = await apiClient.from("blog_posts" as any).insert({
      title: form.title,
      slug,
      content: form.content,
      excerpt: form.excerpt || null,
      image_url: form.image_url || null,
      tags: form.tags ? form.tags.split(",").map((t: string) => t.trim()) : [],
      status: form.status,
      author_id: session?.user?.id || null,
      published_at: form.status === "published" ? new Date().toISOString() : null,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Blog post created");
    setShowForm(false);
    resetForm();
    fetchPosts();
  };

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      title: p.title,
      slug: p.slug,
      content: p.content || "",
      excerpt: p.excerpt || "",
      image_url: p.image_url || "",
      tags: (p.tags || []).join(", "),
      status: p.status,
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await apiClient.from("blog_posts" as any).update({
      title: form.title,
      slug: form.slug,
      content: form.content,
      excerpt: form.excerpt || null,
      image_url: form.image_url || null,
      tags: form.tags ? form.tags.split(",").map((t: string) => t.trim()) : [],
      status: form.status,
      published_at: form.status === "published" ? new Date().toISOString() : null,
    } as any).eq("id", editingId);
    if (error) { toast.error(error.message); return; }
    toast.success("Blog post updated");
    setEditingId(null);
    resetForm();
    fetchPosts();
  };

  const togglePublish = async (p: any) => {
    const newStatus = p.status === "published" ? "draft" : "published";
    const { error } = await apiClient.from("blog_posts" as any).update({
      status: newStatus,
      published_at: newStatus === "published" ? new Date().toISOString() : null,
    } as any).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success(newStatus === "published" ? "Published" : "Unpublished");
    fetchPosts();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await apiClient.from("blog_posts" as any).delete().eq("id", deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success("Blog post deleted");
    setDeleteId(null);
    fetchPosts();
  };

  const renderForm = (onSubmit: (e: React.FormEvent) => void, submitLabel: string, onCancel: () => void) => (
    <form onSubmit={onSubmit} className="bg-card border border-border rounded-xl p-5 mb-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Title</label>
          <input className={inputClass} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.slug || slugify(e.target.value) })} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Slug</label>
          <input className={inputClass} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Status</label>
          <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Tags (comma-separated)</label>
          <input className={inputClass} placeholder="hajj, umrah, travel" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-muted-foreground block mb-1">Image URL</label>
          <input className={inputClass} placeholder="https://..." value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-muted-foreground block mb-1">Excerpt</label>
          <textarea className={inputClass} rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-muted-foreground block mb-1">Content</label>
          <textarea className={inputClass} rows={8} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        </div>
      </div>
      <div className="flex gap-3">
        <button type="submit" className="bg-gradient-gold text-primary-foreground font-semibold py-2.5 px-6 rounded-md text-sm flex items-center gap-2">
          <Save className="h-4 w-4" /> {submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="bg-secondary text-foreground py-2.5 px-6 rounded-md text-sm">Cancel</button>
      </div>
    </form>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{posts.length} blog posts</p>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); resetForm(); }} className="bg-gradient-gold text-primary-foreground text-sm font-semibold px-4 py-2 rounded-md flex items-center gap-2">
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "New Post"}
        </button>
      </div>

      {showForm && !editingId && renderForm(handleCreate, "Create Post", () => { setShowForm(false); resetForm(); })}

      {editingId && renderForm(
        (e) => { e.preventDefault(); saveEdit(); },
        "Update Post",
        () => { setEditingId(null); resetForm(); }
      )}

      <div className="space-y-3">
        {posts.map((p: any) => (
          <div key={p.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-sm truncate">{p.title}</h3>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${p.status === "published" ? "text-emerald bg-emerald/10" : "text-muted-foreground bg-secondary"}`}>
                    {p.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">/{p.slug}</p>
                {p.excerpt && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.excerpt}</p>}
                <div className="flex items-center gap-2 mt-2">
                  {(p.tags || []).map((tag: string) => (
                    <span key={tag} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                  <span className="text-[10px] text-muted-foreground ml-auto">{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => togglePublish(p)} className="text-muted-foreground hover:text-foreground" title={p.status === "published" ? "Unpublish" : "Publish"}>
                  {p.status === "published" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button onClick={() => { startEdit(p); setShowForm(false); }} className="text-muted-foreground hover:text-foreground"><Edit2 className="h-3.5 w-3.5" /></button>
                <button onClick={() => setDeleteId(p.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
        {posts.length === 0 && <p className="text-center text-muted-foreground py-12">No blog posts yet.</p>}
      </div>

      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setDeleteId(null)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading font-bold text-lg mb-2">Delete Post?</h3>
            <p className="text-sm text-muted-foreground mb-4">This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="text-sm px-4 py-2 rounded-md bg-secondary">Cancel</button>
              <button onClick={confirmDelete} className="text-sm px-4 py-2 rounded-md bg-destructive text-destructive-foreground">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
