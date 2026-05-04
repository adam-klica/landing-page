import { Post } from "@/models/Post";
import { notFound } from "next/navigation";
import Link from "next/link";
import { processPostContent } from "@/lib/processPostContent";

async function getPostBySlug(slug: string): Promise<Post | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/posts/slug/${slug}`, {
      cache: "no-store",
    });
    if (res.status === 404) return null;
    return await res.json();
  } catch (error) {
    console.error("Error fetching post:", error);
    return null;
  }
}

export default async function EventPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPostBySlug(params.slug);

  if (!post || post.type !== "event") {
    notFound();
  }

  function formatDate(dateValue?: string | Date) {
    if (!dateValue) return "";
    const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <main className="container" style={{ padding: "2rem 0", maxWidth: "800px" }}>
      <Link href="/" style={{ marginBottom: "1rem", display: "inline-block" }}>
        ← Back to Home
      </Link>

      {post.featuredImage && (
        <img
          src={post.featuredImage}
          alt={post.title}
          style={{ width: "100%", marginBottom: "2rem", borderRadius: "8px" }}
        />
      )}

      <h1 style={{ marginBottom: "1rem" }}>{post.title}</h1>

      <div style={{ marginBottom: "2rem", color: "#666" }}>
        {post.eventDate && (
          <p>
            <strong>Event Date:</strong> {formatDate(post.eventDate)}
          </p>
        )}
        {post.eventLocation && (
          <p>
            <strong>Location:</strong> {post.eventLocation}
          </p>
        )}
        <p>
          <strong>Published:</strong> {formatDate(post.publishedAt || post.createdAt)}
        </p>
      </div>

      {post.excerpt && (
        <p style={{ fontSize: "1.25rem", color: "#555", marginBottom: "2rem", fontStyle: "italic" }}>
          {post.excerpt}
        </p>
      )}

      <div
        className="post-content"
        dangerouslySetInnerHTML={{ __html: processPostContent(post.content) }}
        style={{ lineHeight: "1.8" }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              if (typeof window === 'undefined') return;
              setTimeout(function() {
                var container = document.querySelector('.post-content');
                if (!container) return;
                var uls = container.querySelectorAll('ul');
                uls.forEach(function(ul) {
                  ul.style.cssText = 'list-style: none !important; margin: 1em 0 1em 2em !important; padding: 0 !important;';
                  var lis = ul.querySelectorAll('li');
                  lis.forEach(function(li) {
                    if (li.dataset.processed) return;
                    li.dataset.processed = 'true';
                    li.style.cssText = 'margin: 0.5em 0 !important; padding: 0 0 0 0.5em !important; position: relative !important; list-style: none !important;';
                    if (!li.querySelector('.list-bullet')) {
                      var bullet = document.createElement('span');
                      bullet.className = 'list-bullet';
                      bullet.textContent = '•';
                      bullet.style.cssText = 'position: absolute !important; left: -2em !important; color: #333 !important; font-weight: bold !important; font-size: 1.2em !important; text-align: right !important; min-width: 1.5em !important;';
                      li.insertBefore(bullet, li.firstChild);
                    }
                  });
                });
                var ols = container.querySelectorAll('ol');
                ols.forEach(function(ol) {
                  ol.style.cssText = 'list-style: none !important; margin: 1em 0 1em 2em !important; padding: 0 !important;';
                  var lis = ol.querySelectorAll('li');
                  var counter = 0;
                  lis.forEach(function(li) {
                    counter++;
                    if (li.dataset.processed) return;
                    li.dataset.processed = 'true';
                    li.style.cssText = 'margin: 0.5em 0 !important; padding: 0 0 0 0.5em !important; position: relative !important; list-style: none !important;';
                    if (!li.querySelector('.list-number')) {
                      var number = document.createElement('span');
                      number.className = 'list-number';
                      number.textContent = counter + '.';
                      number.style.cssText = 'position: absolute !important; left: -2em !important; color: #333 !important; min-width: 1.5em !important; text-align: right !important;';
                      li.insertBefore(number, li.firstChild);
                    }
                  });
                });
              }, 100);
            })();
          `,
        }}
      />
    </main>
  );
}
