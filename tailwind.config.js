tailwind.config = {
    theme: {
      extend: {
        colors: {
          navy: {
            DEFAULT: '#1A365D',
            light: '#2A4365',
            dark: '#102A43',
          },
          actionOrange: {
            DEFAULT: '#C2410C',
            light: '#EA580C',
            dark: '#9A3412',
          },
          tealAccent: {
            DEFAULT: '#0D9488',
            light: '#14B8A6',
            dark: '#0F766E',
          },
          coolGray: '#F8FAFC',
          verified: '#0D9488',
          pending: '#C4960C',
          unverified: '#B83B2E',
        },
        fontFamily: {
          serif: ['Playfair Display', 'serif'],
          sans: ['Inter', 'system-ui', 'sans-serif'],
          kufi: ['Readex Pro', 'sans-serif'],
        },
        boxShadow: {
          'premium': '10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.05)',
        },
        borderRadius: {
          'premium': '16px',
        }
      },
    },
    };
