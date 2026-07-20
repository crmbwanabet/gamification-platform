'use client';

import React from 'react';

/**
 * 9-slice frame using CSS `border-image`.
 *
 * Drop a frame PNG/SVG into /public/ui/frames and it stretches to ANY size
 * without distorting the ornate corners — the 4 corners stay fixed, the 4
 * edges stretch along one axis, the center is your own content.
 *
 * This is the technique real money-game UIs use: the art is an asset, the
 * code just places + stretches it.
 *
 * Props:
 *  - src     image url, e.g. "/ui/frames/frame-gold.svg"
 *  - slice   corner size in the SOURCE image's pixels (border-image-slice)
 *  - border  rendered border thickness on screen, px (number) or CSS string
 *  - repeat  'stretch' | 'round' | 'space'  (how edges tile)
 *  - fill    keep the image's CENTER region as background (default false —
 *            you usually supply your own dark content background instead)
 *  - as      element/tag to render (default 'div'); use 'button' for buttons
 *  - className / style / children / ...rest  passed through
 */
export default function NineSliceFrame({
  src,
  slice = 22,
  border = 16,
  repeat = 'stretch',
  fill = false,
  as: Tag = 'div',
  className = '',
  style = {},
  children,
  ...rest
}) {
  const borderWidth = typeof border === 'number' ? `${border}px` : border;
  const frameStyle = {
    boxSizing: 'border-box',
    borderStyle: 'solid',
    borderWidth,
    borderImageSource: `url("${src}")`,
    borderImageSlice: fill ? `${slice} fill` : `${slice}`,
    borderImageRepeat: repeat,
    ...style,
  };
  return (
    <Tag className={className} style={frameStyle} {...rest}>
      {children}
    </Tag>
  );
}
