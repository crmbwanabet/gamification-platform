'use client';

import React from 'react';
import CraftedOverview from '@/components/crafted/CraftedOverview';

// Live preview of the asset-based crafted UI. Visit /crafted-preview during `npm run dev`.
// Swap the art in /public/ui (CC0 kits / Spline 3D PNGs) and this updates with no code changes.

export default function CraftedPreviewPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(130% 100% at 50% -15%, #241a42 0%, #080612 50%, #040308 100%)',
        padding: '50px 20px',
      }}
    >
      <style>{`*{box-sizing:border-box}`}</style>
      <CraftedOverview />
    </div>
  );
}
