'use client';

import React from 'react';
import Image from 'next/image';
import { Newspaper, Clock, Calendar, ArrowRight, User, Tag } from 'lucide-react';
import { BlogPostDto } from '../../lib/types/fenix';
import { formatDate } from '../../lib/utils/format';
import ItemDetailModal from './ItemDetailModal';

interface TiendaBlogViewProps {
  tenantName: string;
  posts: BlogPostDto[];
  accentColor?: string;
}

export default function TiendaBlogView({
  tenantName,
  posts,
  accentColor = '#dc2626',
}: TiendaBlogViewProps) {
  const [selectedPost, setSelectedPost] = React.useState<BlogPostDto | null>(null);
  const [selectedCategory, setSelectedCategory] = React.useState<string>('Todas');

  const categories = React.useMemo(() => {
    const list = Array.from(new Set(posts.map((p) => p.category)));
    return ['Todas', ...list];
  }, [posts]);

  const filteredPosts =
    selectedCategory === 'Todas'
      ? posts
      : posts.filter((p) => p.category === selectedCategory);

  return (
    <section aria-labelledby="blog-heading" className="space-y-8">
      {/* Module Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-800 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-zinc-400">
            <Newspaper className="h-4 w-4" style={{ color: accentColor }} />
            <span>Módulo de Publicaciones Oficiales</span>
          </div>
          <h2 id="blog-heading" className="mt-1 text-2xl font-black text-white">
            Blog &amp; Artículos de {tenantName}
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Novedades, análisis técnicos y guías exclusivas publicadas por el equipo.
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-zinc-100 text-black'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Posts Grid */}
      {filteredPosts.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-12 text-center text-zinc-400">
          <Newspaper className="h-10 w-10 mx-auto text-zinc-600 mb-3" />
          <h3 className="text-base font-bold text-white">No hay artículos publicados</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Actualmente no hay artículos visibles en esta categoría para {tenantName}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <article
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className="group flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900 cursor-pointer shadow-lg"
            >
              <div>
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-950 border border-zinc-800 mb-4">
                  <Image
                    src={post.imageUrl || 'https://picsum.photos/seed/blog/800/500'}
                    alt={post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2.5 left-2.5 rounded bg-black/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-zinc-200 border border-zinc-700">
                    {post.category}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-500 mb-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(post.publishedAt)}
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {post.readTimeMinutes} min de lectura
                  </span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-red-400 transition-colors line-clamp-2">
                  {post.title}
                </h3>

                <p className="mt-2 text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                  {post.excerpt}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                  <User className="h-3.5 w-3.5 text-zinc-500" />
                  <span>{post.author}</span>
                </span>

                <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 group-hover:translate-x-1 transition-transform">
                  <span>Leer completo</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Post Detail Modal */}
      {selectedPost && (
        <ItemDetailModal
          isOpen={Boolean(selectedPost)}
          onClose={() => setSelectedPost(null)}
          title={selectedPost.title}
          badge={selectedPost.category}
          badgeColor={accentColor}
          tenantName={tenantName}
        >
          <div className="space-y-6">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-950 border border-zinc-800">
              <Image
                src={selectedPost.imageUrl}
                alt={selectedPost.title}
                fill
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-400 border-b border-zinc-800/80 pb-4">
              <span>Autor: <strong className="text-white">{selectedPost.author}</strong></span>
              <span>&bull;</span>
              <span>Fecha: <strong className="text-white">{formatDate(selectedPost.publishedAt)}</strong></span>
              <span>&bull;</span>
              <span>Lectura: <strong className="text-white">{selectedPost.readTimeMinutes} min</strong></span>
            </div>

            <p className="text-base text-zinc-200 font-medium leading-relaxed italic border-l-2 border-red-500 pl-4 py-1 bg-zinc-900/40">
              {selectedPost.excerpt}
            </p>

            <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line space-y-4">
              {selectedPost.content}
            </div>

            <div className="pt-4 border-t border-zinc-800 flex flex-wrap gap-1.5 items-center">
              <Tag className="h-3.5 w-3.5 text-zinc-500 mr-1" />
              {selectedPost.tags.map((t) => (
                <span
                  key={t}
                  className="rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[11px] font-mono text-zinc-400"
                >
                  #{t}
                </span>
              ))}
            </div>
          </div>
        </ItemDetailModal>
      )}
    </section>
  );
}
