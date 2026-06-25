import { BOOKS, ERA_META } from '@/lib/books'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import BookDetail from './BookDetail'

export function generateStaticParams() {
  return BOOKS.map(b => ({ id: String(b.n) }))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const book = BOOKS.find(b => b.n === Number(id))
  if (!book) return {}
  return {
    title: `${book.t} — ${book.a} | Философский канон`,
    description: `${book.t}, ${book.a}, ${book.y}. Читать рецензии и оставить свою.`,
  }
}

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const book = BOOKS.find(b => b.n === Number(id))
  if (!book) notFound()

  const prev = BOOKS.find(b => b.n === book.n - 1) ?? null
  const next = BOOKS.find(b => b.n === book.n + 1) ?? null

  return <BookDetail book={book} prev={prev} next={next} />
}
