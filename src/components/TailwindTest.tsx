import React from 'react';

const TailwindTest: React.FC = () => {
  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary">
          Tailwind CSS Variables Test
        </h1>
        <button
          onClick={() => document.documentElement.classList.toggle('dark')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
        >
          Toggle Dark Mode
        </button>
      </div>

      {/* Core Tailwind Colors */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Core Tailwind Colors
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-primary text-primary-foreground p-4 rounded-lg text-center">
            <div className="font-semibold">Primary</div>
            <div className="text-xs opacity-80">bg-primary</div>
          </div>
          <div className="bg-secondary text-secondary-foreground p-4 rounded-lg text-center">
            <div className="font-semibold">Secondary</div>
            <div className="text-xs opacity-80">bg-secondary</div>
          </div>
          <div className="bg-accent text-accent-foreground p-4 rounded-lg text-center">
            <div className="font-semibold">Accent</div>
            <div className="text-xs opacity-80">bg-accent</div>
          </div>
          <div className="bg-destructive text-destructive-foreground p-4 rounded-lg text-center">
            <div className="font-semibold">Destructive</div>
            <div className="text-xs opacity-80">bg-destructive</div>
          </div>
        </div>
      </section>

      {/* Background & Content Colors */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Background & Content
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-card text-card-foreground p-4 rounded-lg border text-center">
            <div className="font-semibold">Card</div>
            <div className="text-xs opacity-80">bg-card</div>
          </div>
          <div className="bg-muted text-muted-foreground p-4 rounded-lg text-center">
            <div className="font-semibold">Muted</div>
            <div className="text-xs opacity-80">bg-muted</div>
          </div>
          <div className="bg-popover text-popover-foreground p-4 rounded-lg border text-center">
            <div className="font-semibold">Popover</div>
            <div className="text-xs opacity-80">bg-popover</div>
          </div>
        </div>
      </section>

      {/* Vintage Colors */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Vintage Colors
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-vintage-sepia text-vintage-brown p-4 rounded-lg border border-vintage-brown text-center">
            <div className="font-semibold">Sepia</div>
            <div className="text-xs opacity-80">bg-vintage-sepia</div>
          </div>
          <div className="bg-vintage-brown text-vintage-cream p-4 rounded-lg text-center">
            <div className="font-semibold">Brown</div>
            <div className="text-xs opacity-80">bg-vintage-brown</div>
          </div>
          <div className="bg-vintage-cream text-vintage-brown p-4 rounded-lg border border-vintage-brown text-center">
            <div className="font-semibold">Cream</div>
            <div className="text-xs opacity-80">bg-vintage-cream</div>
          </div>
          <div className="bg-vintage-gold text-vintage-brown p-4 rounded-lg text-center">
            <div className="font-semibold">Gold</div>
            <div className="text-xs opacity-80">bg-vintage-gold</div>
          </div>
          <div className="bg-vintage-rust text-vintage-cream p-4 rounded-lg text-center">
            <div className="font-semibold">Rust</div>
            <div className="text-xs opacity-80">bg-vintage-rust</div>
          </div>
        </div>
      </section>

      {/* App-specific Colors (converted from SCSS) */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">
          App Colors (SCSS Converted)
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className="p-4 rounded-lg text-center text-white"
              style={{ backgroundColor: 'var(--app-primary-color)' }}
            >
              <div className="font-semibold">App Primary</div>
              <div className="text-xs opacity-80">--app-primary-color</div>
            </div>
            <div
              className="p-4 rounded-lg text-center text-white"
              style={{ backgroundColor: 'var(--app-secondary-color)' }}
            >
              <div className="font-semibold">App Secondary</div>
              <div className="text-xs opacity-80">--app-secondary-color</div>
            </div>
            <div
              className="p-4 rounded-lg text-center text-white"
              style={{ backgroundColor: 'var(--app-accent-color)' }}
            >
              <div className="font-semibold">App Accent</div>
              <div className="text-xs opacity-80">--app-accent-color</div>
            </div>
          </div>

          {/* Hover colors test */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className="p-4 rounded-lg text-center text-white"
              style={{ backgroundColor: 'var(--app-primary-color-hover)' }}
            >
              <div className="font-semibold">App Primary Hover</div>
              <div className="text-xs opacity-80">
                --app-primary-color-hover
              </div>
            </div>
            <div
              className="p-4 rounded-lg text-center text-white"
              style={{ backgroundColor: 'var(--app-secondary-color-hover)' }}
            >
              <div className="font-semibold">App Secondary Hover</div>
              <div className="text-xs opacity-80">
                --app-secondary-color-hover
              </div>
            </div>
            <div
              className="p-4 rounded-lg text-center text-white"
              style={{ backgroundColor: 'var(--app-accent-color-hover)' }}
            >
              <div className="font-semibold">App Accent Hover</div>
              <div className="text-xs opacity-80">--app-accent-color-hover</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Elements */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Interactive Elements
        </h2>
        <div className="space-y-4">
          {/* Input with border and focus ring */}
          <div>
            <label
              htmlFor="test-input"
              className="block text-sm font-medium mb-2 text-foreground"
            >
              Input with border-input and focus-ring
            </label>
            <input
              id="test-input"
              type="text"
              placeholder="Type to test focus ring..."
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            />
          </div>

          {/* Buttons using converted SCSS styles */}
          <div className="flex gap-4 flex-wrap">
            <button className="button-style">
              Default Button (.button-style)
            </button>
            <button className="button-style accent">
              Accent Button (.button-style.accent)
            </button>
            <button className="button-style secondary">
              Secondary Button (.button-style.secondary)
            </button>
          </div>

          {/* Standard Tailwind buttons */}
          <div className="flex gap-4 flex-wrap">
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity">
              Tailwind Primary
            </button>
            <button className="bg-vintage-gold text-vintage-brown px-4 py-2 rounded-md hover:bg-vintage-rust hover:text-vintage-cream transition-all border border-vintage-brown">
              Vintage Button
            </button>
          </div>
        </div>
      </section>

      {/* Custom Components */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Custom Components
        </h2>
        <div className="custom-card">
          <h3 className="text-lg font-semibold mb-4 text-vintage-brown">
            Custom Card (.custom-card)
          </h3>
          <p className="text-vintage-brown mb-4">
            This card uses converted SCSS styles with gradient background and
            app colors.
          </p>
          <div className="flex gap-3 flex-wrap">
            <button className="custom-button">Custom Button</button>
            <button className="custom-button secondary">
              Secondary Custom
            </button>
          </div>
        </div>
      </section>

      {/* Typography & Text Colors */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Typography & Colors
        </h2>
        <div className="space-y-3 bg-card p-4 rounded-lg">
          <p className="text-foreground text-base">
            Foreground text (text-foreground)
          </p>
          <p className="text-muted-foreground text-base">
            Muted foreground text (text-muted-foreground)
          </p>
          <p className="text-vintage-sepia text-lg font-medium">
            Vintage sepia text (text-vintage-sepia)
          </p>
          <p className="text-vintage-brown text-lg font-medium">
            Vintage brown text (text-vintage-brown)
          </p>
          <p className="text-vintage-gold text-lg font-medium">
            Vintage gold text (text-vintage-gold)
          </p>
          <p className="text-vintage-rust text-lg font-medium">
            Vintage rust text (text-vintage-rust)
          </p>
          <p
            className="font-serif text-lg"
            style={{ color: 'var(--docs-color)' }}
          >
            Docs color with serif font (--docs-color, font-serif)
          </p>
        </div>
      </section>

      {/* Layout Variables */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Layout Variables
        </h2>
        <div className="space-y-4">
          <div className="bg-card p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground mb-2">
              Border radius variables:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div
                className="bg-accent text-accent-foreground p-3 text-center text-sm"
                style={{ borderRadius: 'var(--radius)' }}
              >
                var(--radius)
              </div>
              <div
                className="bg-accent text-accent-foreground p-3 text-center text-sm"
                style={{ borderRadius: 'var(--radius-sm)' }}
              >
                var(--radius-sm)
              </div>
              <div
                className="bg-accent text-accent-foreground p-3 text-center text-sm"
                style={{ borderRadius: 'var(--radius-md)' }}
              >
                var(--radius-md)
              </div>
              <div
                className="bg-accent text-accent-foreground p-3 text-center text-sm"
                style={{ borderRadius: 'var(--radius-lg)' }}
              >
                var(--radius-lg)
              </div>
            </div>
          </div>

          <div className="flex-center bg-vintage-sepia p-8 rounded-lg">
            <span className="text-vintage-brown font-semibold">
              Flex center utility (.flex-center) - Should be centered
            </span>
          </div>
        </div>
      </section>

      {/* Variable Values Display */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Current Variable Values
        </h2>
        <div className="bg-card p-4 rounded-lg text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Core Colors (HSL values):
              </h3>
              <div className="space-y-1 text-muted-foreground font-mono">
                <div>
                  --color-background:{' '}
                  {getComputedStyle(document.documentElement).getPropertyValue(
                    '--color-background'
                  ) || 'not set'}
                </div>
                <div>
                  --color-foreground:{' '}
                  {getComputedStyle(document.documentElement).getPropertyValue(
                    '--color-foreground'
                  ) || 'not set'}
                </div>
                <div>
                  --color-primary:{' '}
                  {getComputedStyle(document.documentElement).getPropertyValue(
                    '--color-primary'
                  ) || 'not set'}
                </div>
                <div>
                  --color-accent:{' '}
                  {getComputedStyle(document.documentElement).getPropertyValue(
                    '--color-accent'
                  ) || 'not set'}
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                App Colors (Hex values):
              </h3>
              <div className="space-y-1 text-muted-foreground font-mono">
                <div>
                  --app-primary-color:{' '}
                  {getComputedStyle(document.documentElement).getPropertyValue(
                    '--app-primary-color'
                  ) || 'not set'}
                </div>
                <div>
                  --app-secondary-color:{' '}
                  {getComputedStyle(document.documentElement).getPropertyValue(
                    '--app-secondary-color'
                  ) || 'not set'}
                </div>
                <div>
                  --app-accent-color:{' '}
                  {getComputedStyle(document.documentElement).getPropertyValue(
                    '--app-accent-color'
                  ) || 'not set'}
                </div>
                <div>
                  --docs-color:{' '}
                  {getComputedStyle(document.documentElement).getPropertyValue(
                    '--docs-color'
                  ) || 'not set'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TailwindTest;
