import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './Badge'

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['success', 'warning', 'danger', 'info', 'default', 'lime'],
    },
  },
}

export default meta

type Story = StoryObj<typeof Badge>

export const Default: Story = { args: { children: 'Default', variant: 'default' } }
export const Success: Story = { args: { children: 'Aprovado', variant: 'success' } }
export const Warning: Story = { args: { children: 'Atenção', variant: 'warning' } }
export const Danger: Story = { args: { children: 'Bloqueado', variant: 'danger' } }
export const Info: Story = { args: { children: 'Info', variant: 'info' } }
export const Lime: Story = { args: { children: 'Novo', variant: 'lime' } }
