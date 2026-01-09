import type { Meta, StoryObj } from '@storybook/react';
import '../apps/web/styles/tokens.css';

const meta: Meta = {
  title: 'Design System/Tokens',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

// Color swatches component
const ColorSwatch = ({
  name,
  variable,
  className,
}: {
  name: string;
  variable: string;
  className: string;
}) => (
  <div className="flex flex-col">
    <div className={`w-16 h-16 rounded-lg ${className}`} />
    <p className="text-white text-xs mt-2 font-medium">{name}</p>
    <p className="text-white/50 text-xs">{variable}</p>
  </div>
);

// Colors
export const Colors: StoryObj = {
  render: () => (
    <div className="space-y-8">
      {/* Primary */}
      <div>
        <h3 className="text-white text-lg font-bold mb-4">Primary Colors</h3>
        <div className="flex flex-wrap gap-4">
          <ColorSwatch name="50" variable="--color-primary-50" className="bg-primary-50" />
          <ColorSwatch name="100" variable="--color-primary-100" className="bg-primary-100" />
          <ColorSwatch name="200" variable="--color-primary-200" className="bg-primary-200" />
          <ColorSwatch name="300" variable="--color-primary-300" className="bg-primary-300" />
          <ColorSwatch name="400" variable="--color-primary-400" className="bg-primary-400" />
          <ColorSwatch name="500" variable="--color-primary-500" className="bg-primary-500" />
          <ColorSwatch name="600" variable="--color-primary-600" className="bg-primary-600" />
          <ColorSwatch name="700" variable="--color-primary-700" className="bg-primary-700" />
          <ColorSwatch name="800" variable="--color-primary-800" className="bg-primary-800" />
          <ColorSwatch name="900" variable="--color-primary-900" className="bg-primary-900" />
        </div>
      </div>

      {/* Festival Theme */}
      <div>
        <h3 className="text-white text-lg font-bold mb-4">Festival Theme Colors</h3>
        <div className="flex flex-wrap gap-4">
          <ColorSwatch
            name="Dark"
            variable="--color-festival-dark"
            className="bg-festival-dark border border-white/10"
          />
          <ColorSwatch
            name="Medium"
            variable="--color-festival-medium"
            className="bg-festival-medium"
          />
          <ColorSwatch
            name="Light"
            variable="--color-festival-light"
            className="bg-festival-light"
          />
          <ColorSwatch
            name="Accent"
            variable="--color-festival-accent"
            className="bg-festival-accent"
          />
        </div>
      </div>

      {/* Semantic Colors */}
      <div>
        <h3 className="text-white text-lg font-bold mb-4">Semantic Colors</h3>
        <div className="grid grid-cols-4 gap-8">
          <div>
            <p className="text-white/60 text-sm mb-2">Success</p>
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded bg-green-400" />
              <div className="w-8 h-8 rounded bg-green-500" />
              <div className="w-8 h-8 rounded bg-green-600" />
            </div>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-2">Warning</p>
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded bg-orange-400" />
              <div className="w-8 h-8 rounded bg-orange-500" />
              <div className="w-8 h-8 rounded bg-orange-600" />
            </div>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-2">Error</p>
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded bg-red-400" />
              <div className="w-8 h-8 rounded bg-red-500" />
              <div className="w-8 h-8 rounded bg-red-600" />
            </div>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-2">Info</p>
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded bg-blue-400" />
              <div className="w-8 h-8 rounded bg-blue-500" />
              <div className="w-8 h-8 rounded bg-blue-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

// Spacing
export const Spacing: StoryObj = {
  render: () => (
    <div className="space-y-6">
      <h3 className="text-white text-lg font-bold">Spacing Scale</h3>
      <div className="space-y-3">
        {[
          { name: '1', value: '4px', class: 'w-1' },
          { name: '2', value: '8px', class: 'w-2' },
          { name: '3', value: '12px', class: 'w-3' },
          { name: '4', value: '16px', class: 'w-4' },
          { name: '5', value: '20px', class: 'w-5' },
          { name: '6', value: '24px', class: 'w-6' },
          { name: '8', value: '32px', class: 'w-8' },
          { name: '10', value: '40px', class: 'w-10' },
          { name: '12', value: '48px', class: 'w-12' },
          { name: '16', value: '64px', class: 'w-16' },
          { name: '20', value: '80px', class: 'w-20' },
          { name: '24', value: '96px', class: 'w-24' },
        ].map((item) => (
          <div key={item.name} className="flex items-center gap-4">
            <span className="text-white/60 text-sm w-8">{item.name}</span>
            <div className={`h-4 bg-primary-500 rounded ${item.class}`} />
            <span className="text-white/40 text-xs">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  ),
};

// Typography
export const Typography: StoryObj = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-white text-lg font-bold mb-4">Font Sizes</h3>
        <div className="space-y-4">
          <p className="text-white text-xs">text-xs (12px)</p>
          <p className="text-white text-sm">text-sm (14px)</p>
          <p className="text-white text-base">text-base (16px)</p>
          <p className="text-white text-lg">text-lg (18px)</p>
          <p className="text-white text-xl">text-xl (20px)</p>
          <p className="text-white text-2xl">text-2xl (24px)</p>
          <p className="text-white text-3xl">text-3xl (30px)</p>
          <p className="text-white text-4xl">text-4xl (36px)</p>
        </div>
      </div>

      <div>
        <h3 className="text-white text-lg font-bold mb-4">Font Weights</h3>
        <div className="space-y-2">
          <p className="text-white text-xl font-light">Light (300)</p>
          <p className="text-white text-xl font-normal">Normal (400)</p>
          <p className="text-white text-xl font-medium">Medium (500)</p>
          <p className="text-white text-xl font-semibold">Semibold (600)</p>
          <p className="text-white text-xl font-bold">Bold (700)</p>
          <p className="text-white text-xl font-extrabold">Extrabold (800)</p>
        </div>
      </div>
    </div>
  ),
};

// Border Radius
export const BorderRadius: StoryObj = {
  render: () => (
    <div className="space-y-6">
      <h3 className="text-white text-lg font-bold">Border Radius</h3>
      <div className="flex flex-wrap gap-6">
        {[
          { name: 'none', class: 'rounded-none' },
          { name: 'sm', class: 'rounded-sm' },
          { name: 'md', class: 'rounded-md' },
          { name: 'lg', class: 'rounded-lg' },
          { name: 'xl', class: 'rounded-xl' },
          { name: '2xl', class: 'rounded-2xl' },
          { name: '3xl', class: 'rounded-3xl' },
          { name: 'full', class: 'rounded-full' },
        ].map((item) => (
          <div key={item.name} className="text-center">
            <div className={`w-16 h-16 bg-primary-500 ${item.class}`} />
            <p className="text-white/60 text-xs mt-2">{item.name}</p>
          </div>
        ))}
      </div>
    </div>
  ),
};

// Shadows
export const Shadows: StoryObj = {
  render: () => (
    <div className="space-y-6">
      <h3 className="text-white text-lg font-bold">Shadows</h3>
      <div className="flex flex-wrap gap-8">
        {[
          { name: 'sm', class: 'shadow-sm' },
          { name: 'md', class: 'shadow-md' },
          { name: 'lg', class: 'shadow-lg' },
          { name: 'xl', class: 'shadow-xl' },
          { name: '2xl', class: 'shadow-2xl' },
        ].map((item) => (
          <div key={item.name} className="text-center">
            <div className={`w-20 h-20 bg-white/10 rounded-xl ${item.class}`} />
            <p className="text-white/60 text-xs mt-2">{item.name}</p>
          </div>
        ))}
      </div>

      <h3 className="text-white text-lg font-bold mt-8">Glow Effects</h3>
      <div className="flex flex-wrap gap-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-primary-500/20 rounded-xl shadow-lg shadow-primary-500/30" />
          <p className="text-white/60 text-xs mt-2">Primary Glow</p>
        </div>
        <div className="text-center">
          <div className="w-20 h-20 bg-pink-500/20 rounded-xl shadow-lg shadow-pink-500/30" />
          <p className="text-white/60 text-xs mt-2">Secondary Glow</p>
        </div>
        <div className="text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-xl shadow-lg shadow-green-500/30" />
          <p className="text-white/60 text-xs mt-2">Success Glow</p>
        </div>
      </div>
    </div>
  ),
};

// Z-Index
export const ZIndex: StoryObj = {
  render: () => (
    <div className="space-y-6">
      <h3 className="text-white text-lg font-bold">Z-Index Scale</h3>
      <div className="relative h-64 w-full">
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary-900 rounded-lg flex items-center justify-center z-0">
          <span className="text-white text-sm">z-0</span>
        </div>
        <div className="absolute bottom-4 left-4 w-32 h-32 bg-primary-800 rounded-lg flex items-center justify-center z-10">
          <span className="text-white text-sm">z-10</span>
        </div>
        <div className="absolute bottom-8 left-8 w-32 h-32 bg-primary-700 rounded-lg flex items-center justify-center z-20">
          <span className="text-white text-sm">z-20</span>
        </div>
        <div className="absolute bottom-12 left-12 w-32 h-32 bg-primary-600 rounded-lg flex items-center justify-center z-30">
          <span className="text-white text-sm">z-30</span>
        </div>
        <div className="absolute bottom-16 left-16 w-32 h-32 bg-primary-500 rounded-lg flex items-center justify-center z-40">
          <span className="text-white text-sm">z-40</span>
        </div>
      </div>

      <div className="mt-8">
        <h4 className="text-white font-medium mb-2">Component Z-Index Reference</h4>
        <div className="text-white/60 text-sm space-y-1">
          <p>Dropdown: z-100</p>
          <p>Sticky: z-200</p>
          <p>Modal: z-300</p>
          <p>Popover: z-400</p>
          <p>Tooltip: z-500</p>
          <p>Toast: z-600</p>
        </div>
      </div>
    </div>
  ),
};
