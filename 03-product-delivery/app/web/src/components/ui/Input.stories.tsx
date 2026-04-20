import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './Input'

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
}

export default meta

type Story = StoryObj<typeof Input>

export const Default: Story = {
  args: {
    label: 'E-mail',
    placeholder: 'voce@email.com',
  },
}

export const WithHint: Story = {
  args: {
    label: 'CPF',
    placeholder: '000.000.000-00',
    hint: 'Apenas números.',
  },
}

export const WithError: Story = {
  args: {
    label: 'Senha',
    type: 'password',
    error: 'Senha muito curta.',
  },
}
