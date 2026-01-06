import type { Meta, StoryObj } from '@storybook/svelte';
import ChatHeader from './ChatHeader.svelte';
import ChatHeaderAllStyles from './ChatHeaderAllStyles.svelte';
import ChatHeaderWavyFrequencies from './ChatHeaderWavyFrequencies.svelte';
import ChatHeaderHeightVariants from './ChatHeaderHeightVariants.svelte';
import ChatHeaderWithWidget from './ChatHeaderWithWidget.svelte';

const meta = {
  title: 'Custom/ChatHeader',
  component: ChatHeader as any,
  tags: ['autodocs'],
  parameters: {
    docs: {
      source: {
        state: 'open'
      }
    },
    layout: 'padded'
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'The title text displayed in the header. Defaults to "Chat Support".',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: '"Chat Support"' }
      }
    },
    style: {
      control: 'select',
      options: ['flat', 'wavy', 'glass', 'minimal', 'none'],
      description: 'Visual style of the header. `flat` uses a gradient background, `wavy` adds a wavy bottom border, `glass` creates a frosted glass effect, `minimal` has a subtle gradient with accent line, and `none` provides a clean minimal look.',
      table: {
        type: { summary: "'flat' | 'wavy' | 'glass' | 'minimal' | 'none'" },
        defaultValue: { summary: "'wavy'" }
      }
    },
    darkMode: {
      control: 'boolean',
      description: 'Enables dark mode styling for the header.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' }
      }
    },
    onClose: {
      action: 'closed',
      description: 'Callback function called when the close button is clicked. If not provided, the close button will not be displayed.',
      table: {
        type: { summary: '() => void' },
        defaultValue: { summary: 'undefined' }
      }
    },
    titleAlign: {
      control: 'select',
      options: ['left', 'center', 'right'],
      description: 'Alignment of the title and icon. `left` (default) aligns to the left, `center` centers the title, and `right` aligns to the right.',
      table: {
        type: { summary: "'left' | 'center' | 'right'" },
        defaultValue: { summary: "'left'" }
      }
    },
    menuItems: {
      description: 'Array of menu items to display in the three-dots dropdown menu. Each item should have an `id`, `label`, optional `icon` (string or icon name like "settings", "help", "about", "feedback"), optional `iconType` ("svg" or "emoji"), and optional `onClick` handler. If provided and non-empty, the menu button will be displayed.',
      table: {
        type: { summary: 'Array<{ id: string; label: string; icon?: string; iconType?: "svg" | "emoji"; onClick?: () => void }>' },
        defaultValue: { summary: 'undefined' }
      }
    },
    onMenuItemClick: {
      action: 'menuItemClicked',
      description: 'Callback function called when a menu item is clicked. Receives the item `id` as a parameter. This is called in addition to any item-specific `onClick` handler.',
      table: {
        type: { summary: '(itemId: string) => void' },
        defaultValue: { summary: 'undefined' }
      }
    },
    menuPosition: {
      control: 'select',
      options: ['left', 'right'],
      description: 'Position of the menu button. `left` places it on the left side (useful with centered title), `right` (default) places it on the right side.',
      table: {
        type: { summary: "'left' | 'right'" },
        defaultValue: { summary: "'right'" }
      }
    },
    menuMode: {
      control: 'select',
      options: ['dropdown', 'sidebar'],
      description: 'Display mode for the menu. `dropdown` (default) shows a small dropdown below the button, `sidebar` shows a full-height sidebar that slides in from the side.',
      table: {
        type: { summary: "'dropdown' | 'sidebar'" },
        defaultValue: { summary: "'dropdown'" }
      }
    },
    waveFrequency: {
      control: 'select',
      options: ['tight', 'spread'],
      description: 'Wave frequency for the wavy header style. `tight` (default) creates more frequent, tighter waves, `spread` creates fewer, more spread out waves.',
      table: {
        type: { summary: "'tight' | 'spread'" },
        defaultValue: { summary: "'tight'" }
      }
    },
    height: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Header height variant. `sm` is smaller with less padding, `md` (default) is medium size, `lg` is larger with more padding.',
      table: {
        type: { summary: "'sm' | 'md' | 'lg'" },
        defaultValue: { summary: "'md'" }
      }
    },
    showIcon: {
      control: 'boolean',
      description: 'Whether to show the message bubble icon next to the title. Set to `false` to hide the icon.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' }
      }
    }
  },
} satisfies Meta<any>;

export default meta;
type Story = StoryObj<any>;

export const Flat: Story = {
  args: {
    title: 'Chat Support',
    style: 'flat',
    darkMode: false,
  },
};

export const Wavy: Story = {
  args: {
    title: 'Chat Support',
    style: 'wavy',
    darkMode: false,
  },
};

export const Glass: Story = {
  args: {
    title: 'Chat Support',
    style: 'glass',
    darkMode: false,
  },
};

export const Minimal: Story = {
  args: {
    title: 'Chat Support',
    style: 'minimal',
    darkMode: false,
  },
};

export const None: Story = {
  args: {
    title: 'Chat Support',
    style: 'none',
    darkMode: false,
  },
};

export const DarkMode: Story = {
  args: {
    title: 'Chat Support',
    style: 'wavy',
    darkMode: true,
  },
  render: (args) => ({
    Component: ChatHeader as any,
    props: args,
  }),
  decorators: [
    () => ({
      Component: 'div',
      props: {
        style: 'background: #1f2937; padding: 20px; border-radius: 8px;'
      }
    })
  ]
};

export const AllStyles: Story = {
  render: () => ({
    Component: ChatHeaderAllStyles as any,
  })
};

export const CenteredTitle: Story = {
  args: {
    title: 'Chat Support',
    style: 'wavy',
    titleAlign: 'center',
    darkMode: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Example of a header with centered title alignment. The title and icon are centered while action buttons remain on the right.'
      }
    }
  }
};

export const WithMenu: Story = {
  args: {
    title: 'Chat Support',
    style: 'wavy',
    darkMode: false,
    menuItems: [
      { id: 'settings', label: 'Settings', icon: 'settings', iconType: 'svg', onClick: () => console.log('Settings clicked') },
      { id: 'help', label: 'Help', icon: 'help', iconType: 'svg', onClick: () => console.log('Help clicked') },
      { id: 'about', label: 'About', icon: 'about', iconType: 'svg', onClick: () => console.log('About clicked') }
    ],
    onMenuItemClick: (itemId) => console.log('Menu item clicked:', itemId)
  },
  parameters: {
    docs: {
      description: {
        story: 'Header with three-dots menu dropdown using SVG icons. Click the menu button to see the dropdown with menu items. Each item uses SVG icons instead of emojis.'
      }
    }
  }
};

export const CenteredWithMenu: Story = {
  args: {
    title: 'Chat Support',
    style: 'glass',
    titleAlign: 'center',
    darkMode: false,
    menuItems: [
      { id: 'settings', label: 'Settings', icon: '⚙️' },
      { id: 'help', label: 'Help', icon: '❓' },
      { id: 'about', label: 'About', icon: 'ℹ️' },
      { id: 'feedback', label: 'Send Feedback', icon: '💬' }
    ],
    onClose: () => console.log('Close clicked')
  },
  parameters: {
    docs: {
      description: {
        story: 'Combines centered title alignment with menu dropdown. Demonstrates how both features work together.'
      }
    }
  }
};

export const MenuItemsExample: Story = {
  args: {
    title: 'Chat Support',
    style: 'minimal',
    darkMode: false,
    menuItems: [
      { id: 'with-icon', label: 'Item with Icon', icon: 'settings', iconType: 'svg' },
      { id: 'no-icon', label: 'Item without Icon' },
      { id: 'another', label: 'Another Item', icon: 'help', iconType: 'svg' },
      { id: 'feedback', label: 'Send Feedback', icon: 'feedback', iconType: 'svg' }
    ],
    onMenuItemClick: (itemId) => console.log('Clicked:', itemId)
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows menu items with and without icons. Menu items can have optional SVG icons (using icon names like "settings", "help", "about", "feedback") and will display properly whether an icon is provided or not.'
      }
    }
  }
};

export const CenteredTitleWithLeftMenu: Story = {
  args: {
    title: 'Chat Support',
    style: 'glass',
    titleAlign: 'center',
    menuPosition: 'left',
    menuMode: 'sidebar',
    darkMode: false,
    menuItems: [
      { id: 'settings', label: 'Settings', icon: 'settings', iconType: 'svg' },
      { id: 'help', label: 'Help', icon: 'help', iconType: 'svg' },
      { id: 'about', label: 'About', icon: 'about', iconType: 'svg' }
    ],
    onClose: () => console.log('Close clicked')
  },
  parameters: {
    docs: {
      description: {
        story: 'Title centered with menu button on the left side. The menu opens as a full-height sidebar from the left. This layout is useful when you want the title centered but still have menu access on the left.'
      },
      layout: 'fullscreen'
    }
  }
};

export const SidebarMenu: Story = {
  args: {
    title: 'Chat Support',
    style: 'wavy',
    darkMode: false,
    menuMode: 'sidebar',
    menuPosition: 'right',
    menuItems: [
      { id: 'settings', label: 'Settings', icon: 'settings', iconType: 'svg' },
      { id: 'help', label: 'Help', icon: 'help', iconType: 'svg' },
      { id: 'about', label: 'About', icon: 'about', iconType: 'svg' },
      { id: 'feedback', label: 'Send Feedback', icon: 'feedback', iconType: 'svg' },
      { id: 'preferences', label: 'Preferences', icon: 'settings', iconType: 'svg' }
    ],
    onMenuItemClick: (itemId) => console.log('Menu item clicked:', itemId)
  },
  parameters: {
    docs: {
      description: {
        story: 'Sidebar mode menu that slides in from the right and covers the full height of the chat window. Includes a backdrop overlay that closes the sidebar when clicked.'
      },
      layout: 'fullscreen'
    }
  }
};

export const SidebarMenuLeft: Story = {
  args: {
    title: 'Chat Support',
    style: 'flat',
    darkMode: false,
    menuMode: 'sidebar',
    menuPosition: 'left',
    menuItems: [
      { id: 'settings', label: 'Settings', icon: 'settings', iconType: 'svg' },
      { id: 'help', label: 'Help', icon: 'help', iconType: 'svg' },
      { id: 'about', label: 'About', icon: 'about', iconType: 'svg' }
    ],
    onMenuItemClick: (itemId) => console.log('Menu item clicked:', itemId)
  },
  parameters: {
    docs: {
      description: {
        story: 'Sidebar mode menu that slides in from the left side. Useful for left-aligned navigation patterns.'
      },
      layout: 'fullscreen'
    }
  }
};

export const WavyFrequencies: Story = {
  render: () => ({
    Component: ChatHeaderWavyFrequencies as any,
  }),
  parameters: {
    docs: {
      description: {
        story: 'Comparison of tight and spread wave frequencies. Tight waves are more frequent, while spread waves are more spaced out.'
      }
    }
  }
};

export const HeightVariants: Story = {
  render: () => ({
    Component: ChatHeaderHeightVariants as any,
  }),
  parameters: {
    docs: {
      description: {
        story: 'Three height variants: small (sm), medium (md - default), and large (lg). Each has different padding and font sizes.'
      }
    }
  }
};

export const TitleWithoutIcon: Story = {
  args: {
    title: 'Chat Support',
    style: 'wavy',
    showIcon: false,
    darkMode: false,
    onClose: () => console.log('Close clicked')
  },
  parameters: {
    docs: {
      description: {
        story: 'Header with title but no icon next to it. Set `showIcon={false}` to hide the message bubble icon.'
      }
    }
  }
};

export const FullExample: Story = {
  args: {
    title: 'Chat Support',
    style: 'wavy',
    titleAlign: 'center',
    menuPosition: 'left',
    menuMode: 'sidebar',
    waveFrequency: 'spread',
    height: 'lg',
    darkMode: false,
    menuItems: [
      { id: 'settings', label: 'Settings', icon: 'settings', iconType: 'svg' },
      { id: 'help', label: 'Help', icon: 'help', iconType: 'svg' },
      { id: 'about', label: 'About', icon: 'about', iconType: 'svg' },
      { id: 'feedback', label: 'Send Feedback', icon: 'feedback', iconType: 'svg' }
    ],
    onClose: () => console.log('Close clicked'),
    onMenuItemClick: (itemId) => console.log('Menu item clicked:', itemId)
  },
  parameters: {
    docs: {
      description: {
        story: 'Full example combining multiple features: centered title, left menu position, sidebar mode, spread waves, and large height.'
      },
      layout: 'fullscreen'
    }
  }
};

export const WithWidget: Story = {
  render: () => ({
    Component: ChatHeaderWithWidget as any,
  }),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'ChatHeader menu tested within ChatWidget context. This demonstrates how menus are properly contained within the chat window (380px wide) instead of covering the entire page. The menu should slide in from the side and be constrained to the widget boundaries. Try different menu modes (dropdown/sidebar) and positions (left/right) to verify proper containment.'
      }
    }
  }
};

