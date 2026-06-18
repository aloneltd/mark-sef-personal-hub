import React from 'react'
import { ContentStore } from '../types'
import SectionRenderer from '../components/sections/SectionRenderer'

const About: React.FC<{ store: ContentStore }> = ({ store }) => {
  const layout = store.pageLayouts.about
  const sortedSections = [...layout.sections].sort((a, b) => a.order - b.order)
  return (
    <div className="animate-in">
      {sortedSections.map(section => <SectionRenderer key={section.id} section={section} store={store} />)}
    </div>
  )
}

export default About
