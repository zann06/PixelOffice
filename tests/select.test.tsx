import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PixelSelect } from '../src/components/ui/PixelSelect'

describe('PixelSelect', () => {
  it('opens, picks with mouse and keyboard, reports e.target.value', () => {
    const onChange = vi.fn()
    render(
      <PixelSelect aria-label="Status" value="all" onChange={(e) => onChange(e.target.value)}>
        <option value="all">Semua status</option>
        <option value="todo">Belum dikerjakan</option>
        <option value="done">Selesai</option>
      </PixelSelect>,
    )
    const box = screen.getByRole('combobox', { name: 'Status' })
    fireEvent.click(box)
    expect(screen.getAllByRole('option')).toHaveLength(3)
    fireEvent.click(screen.getByText('Belum dikerjakan'))
    expect(onChange).toHaveBeenLastCalledWith('todo')
    expect(screen.queryByRole('listbox')).toBeNull()
    fireEvent.keyDown(box, { key: 'ArrowDown' })
    fireEvent.keyDown(box, { key: 'ArrowDown' })
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(onChange).toHaveBeenLastCalledWith('todo')
    fireEvent.keyDown(box, { key: 'Escape' })
  })
})
