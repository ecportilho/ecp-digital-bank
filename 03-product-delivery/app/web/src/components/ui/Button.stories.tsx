import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
}

export default meta

type Story = StoryObj<typeof Button>

export const Default: Story = {
  args: {
    children: 'Confirmar',
    variant: 'primary',
    size: 'md',
  },
}

export const Secondary: Story = {
  args: {
    children: 'Cancelar',
    variant: 'secondary',
  },
}

export const Danger: Story = {
  args: {
    children: 'Excluir',
    variant: 'danger',
  },
}

export const Disabled: Story = {
  args: {
    children: 'Indisponível',
    disabled: true,
  },
}

export const Loading: Story = {
  args: {
    children: 'Processando...',
    isLoading: true,
  },
}
