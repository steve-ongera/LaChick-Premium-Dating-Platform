/**
 * components/SEOHead.jsx
 * Updates <head> meta tags for SEO on each page.
 * Uses vanilla DOM manipulation (no extra library needed with Vite).
 *
 * Usage:
 *   <SEOHead
 *     title="John Doe, 28 — Nairobi | LaChick"
 *     description="Meet John, a software engineer from Nairobi…"
 *     image="https://cdn.lachick.co.ke/avatars/johndoe.jpg"
 *     url="https://lachick.co.ke/profiles/johndoe-abc12345"
 *   />
 */

import { useEffect } from 'react'

export default function SEOHead({ title, description, image, url }) {
  useEffect(() => {
    // Title
    if (title) document.title = title

    const setMeta = (selector, attr, value) => {
      let el = document.querySelector(selector)
      if (!el) {
        el = document.createElement('meta')
        const [attrName, attrVal] = selector.replace('meta[', '').replace(']', '').split('=')
        el.setAttribute(attrName, attrVal.replace(/"/g, ''))
        document.head.appendChild(el)
      }
      el.setAttribute(attr, value)
    }

    if (description) {
      setMeta('meta[name="description"]',        'content', description)
      setMeta('meta[property="og:description"]', 'content', description)
      setMeta('meta[name="twitter:description"]','content', description)
    }

    if (title) {
      setMeta('meta[property="og:title"]',   'content', title)
      setMeta('meta[name="twitter:title"]',  'content', title)
    }

    if (image) {
      setMeta('meta[property="og:image"]',   'content', image)
      setMeta('meta[name="twitter:image"]',  'content', image)
    }

    if (url) {
      setMeta('meta[property="og:url"]', 'content', url)
      let canonical = document.querySelector('link[rel="canonical"]')
      if (!canonical) {
        canonical = document.createElement('link')
        canonical.rel = 'canonical'
        document.head.appendChild(canonical)
      }
      canonical.href = url
    }
  }, [title, description, image, url])

  return null
}