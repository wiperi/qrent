import React from 'react'
import Container from './Container'
import MenuAnimation from './animata/list/menu-animation';

const Hero = () => {
  return (
    <section id="Home" className='overflow-hidden py-20 sm:py-32 lg:pd-32 xl:pb-3'>
        <Container>
            <div>
                {/* Left side: 3 main buttons: RENTAL GUIDE, FIND A HOME, APPLY DOCUMENTS */}
                <MenuAnimation 
                    menuItems={[
                        'RENTAL GUIDE',
                        'FIND A HOME',
                        'APPLY DOCUMENTS'
                    ]}
                />
                {/* Right side: Automatic Slideshow, click to see details */}
            </div>
        </Container>
    </section>
  );
}

export default Hero
