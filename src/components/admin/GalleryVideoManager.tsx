import { useEffect, useState } from "react";
import { Plus, Trash2, Save, Youtube, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useSiteContent, useUpdateSiteContent } from "@/hooks/useSiteContent";
import { getYouTubeId, getYouTubeThumbnail, isYouTubeUrl } from "@/lib/youtube";

type VideoItem = { url: string; title?: string };

export default function GalleryVideoManager() {
  const { data: content, isLoading } = useSiteContent("gallery");
  const update = useUpdateSiteContent();

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    if (content?.video_items && Array.isArray(content.video_items)) {
      setVideos(content.video_items);
    }
  }, [content]);

  const addVideo = () => {
    const url = newUrl.trim();
    if (!url) return toast.error("Please paste a YouTube URL");
    if (!isYouTubeUrl(url)) return toast.error("Invalid YouTube URL");
    if (videos.some((v) => getYouTubeId(v.url) === getYouTubeId(url))) {
      return toast.error("This video is already added");
    }
    setVideos([...videos, { url, title: newTitle.trim() || undefined }]);
    setNewUrl("");
    setNewTitle("");
  };

  const removeVideo = (i: number) => setVideos(videos.filter((_, idx) => idx !== i));

  const save = async () => {
    const merged = { ...(content || {}), video_items: videos };
    await update.mutateAsync({ sectionKey: "gallery", content: merged });
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-heading text-lg font-bold flex items-center gap-2">
          <Youtube className="h-5 w-5 text-red-500" /> Gallery Videos (YouTube)
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Paste a YouTube link (watch / share / shorts / embed) and click Add. Then click Save Changes.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-2">
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="bg-secondary border border-border rounded-md px-3 py-2 text-sm"
            maxLength={500}
          />
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title (optional)"
            className="bg-secondary border border-border rounded-md px-3 py-2 text-sm"
            maxLength={120}
          />
          <button
            onClick={addVideo}
            type="button"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
        {newUrl && isYouTubeUrl(newUrl) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <img src={getYouTubeThumbnail(newUrl)!} alt="preview" className="h-12 w-20 object-cover rounded" />
            <span>Preview · ID: {getYouTubeId(newUrl)}</span>
          </div>
        )}
      </div>

      {videos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No videos added yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {videos.map((v, i) => {
            const thumb = getYouTubeThumbnail(v.url);
            return (
              <div key={i} className="rounded-lg border border-border bg-card overflow-hidden">
                {thumb && <img src={thumb} alt={v.title || "video"} className="w-full aspect-video object-cover" />}
                <div className="p-3 space-y-2">
                  <p className="text-sm font-medium truncate">{v.title || `Video ${i + 1}`}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{v.url}</p>
                  <div className="flex items-center justify-between">
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Open
                    </a>
                    <button
                      onClick={() => removeVideo(i)}
                      className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={update.isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {update.isPending ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
