import Masonry from 'react-masonry-css'
import type { Image } from '../lib/supabase'
import ImageCard from './ImageCard'
import './ImageGrid.css'

interface ImageGridProps {
  images: Image[]
}

export default function ImageGrid({ images }: ImageGridProps) {
  const breakpoints = {
    default: 5,
    1400: 4,
    1000: 3,
    700: 2,
    500: 1
  }

  return (
    <Masonry
      breakpointCols={breakpoints}
      className="masonry-grid"
      columnClassName="masonry-grid-column"
    >
      {images.map(image => (
        <ImageCard key={image.id} image={image} />
      ))}
    </Masonry>
  )
}
