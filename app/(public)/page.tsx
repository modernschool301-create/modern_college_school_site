import { HeroNavMode } from '@/components/nav-hero-context';
import { Hero } from '@/components/home/hero';
import { ThreeBenefits } from '@/components/home/three-benefits';
import { VoicePreview } from '@/components/home/voice-preview';
import { ProgrammesOverview } from '@/components/home/programmes-overview';
import { FeaturesStrip } from '@/components/home/features-strip';
import { NewsTeaser } from '@/components/home/news-teaser';
import { ClosingCTA } from '@/components/home/closing-cta';
import { StickyApplyCta } from '@/components/home/sticky-apply-cta';
import { HomePopup } from '@/components/home/home-popup';
import { heroMedia } from '@/lib/cloudinary-url';

export default function HomePage() {
  // Built server-side: the (non-public) cloud name stays on the server; only the
  // resulting public delivery URLs reach the browser. Falls back cleanly to the
  // green-forest panel if the cloud name isn't configured.
  const media = heroMedia(
    process.env.CLOUDINARY_CLOUD_NAME ?? '',
    process.env.NEXT_PUBLIC_HERO_VIDEO_ID ?? 'modern/hero',
  );

  return (
    <>
      {/* Tell the nav this page owns a hero (starts transparent, solid on scroll). */}
      <HeroNavMode />

      {/* Story-first order: hero → value prop + stats (one block) → human
          voices → programmes → supporting facilities → news → closing CTA. */}
      <Hero media={media} />
      <ThreeBenefits />
      <VoicePreview />
      <ProgrammesOverview />
      <FeaturesStrip />
      <NewsTeaser />
      <ClosingCTA />

      {/* Mobile-only persistent Apply button. */}
      <StickyApplyCta />

      {/* Homepage pop-up shell (PRD Decision 12). Inert until the Settings
          module supplies popup_is_active + banner image/link/alt. TODO: wire
          these props from the settings store. */}
      <HomePopup active={false} />
    </>
  );
}
