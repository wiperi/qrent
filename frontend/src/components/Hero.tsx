import React from 'react'
import Container from './Container'
import MenuAnimation from './animata/list/menu-animation';
import Expandable from './animata/carousel/expandable';

const Hero = () => {
  return (
    <section id="Home" className='overflow-hidden py-20 sm:py-32 lg:pd-32 xl:pb-3'>
        <Container>
            <div className="flex justify-between items-center">
                {/* Left side: 3 main buttons: RENTAL GUIDE, FIND A HOME, APPLY DOCUMENTS */}
                <MenuAnimation 
                    menuItems={[
                        'RENTAL GUIDE',
                        'FIND A HOME',
                        'APPLY DOCUMENTS'
                    ]}
                />
                {/* Right side: Automatic Slideshow, click to see details */}
                <Expandable className='fixed right-10 w-1/2 min-w-72 storybook-fix'/>
            </div>
        </Container>
    </section>
  );
}

export default Hero
