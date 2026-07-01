/**
 * Development route to test input styles, toggles, and form patterns
 * Route: /dev/inputs-test
 */

import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeader } from '@cdecaire/sable'
import { Grid, Region, Row, Stack } from '@cdecaire/sable/layout'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Tooltip } from '@/components/ui/tooltip'
import { PostTypeSelector, type PostType } from '@/components/forms/PostTypeSelector'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const Route = createFileRoute('/dev/inputs-test')({
  component: InputsTestPage,
})

function InputsTestPage() {
  const [textValue, setTextValue] = useState('')
  const [bioValue, setBioValue] = useState('')
  const [checkboxChecked, setCheckboxChecked] = useState(false)
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState<'SOL' | 'USDC'>('SOL')
  const [royalties, setRoyalties] = useState('5.00')
  const [postType, setPostType] = useState<PostType>('post')

  return (
    <Region max="wide" inset className="py-6">
      <Stack gap={3}>
        <PageHeader
          title="Inputs & Toggles"
          description="Standard input components, textarea patterns, switches, and checkboxes."
        />

        {/* Input Types */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Input Types</h2>
          <Grid minItemWidth="16rem" gap={2}>
            <div>
              <label className="text-sm font-medium mb-2 block">Text</label>
              <Input placeholder="Enter text..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Number</label>
              <Input type="number" placeholder="0" step="any" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">URL</label>
              <Input type="url" placeholder="https://example.com" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <Input type="email" placeholder="you@example.com" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Password</label>
              <Input type="password" placeholder="Password" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">File</label>
              <Input type="file" accept="image/*" />
            </div>
          </Grid>
        </Card>

        {/* Input States */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Input States</h2>
          <Grid minItemWidth="16rem" gap={2}>
            <div>
              <label className="text-sm font-medium mb-2 block">Default</label>
              <Input placeholder="Default state" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Disabled</label>
              <Input placeholder="Disabled input" disabled />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Error (aria-invalid)</label>
              <Input placeholder="Error state" aria-invalid="true" />
              <p className="text-xs text-destructive mt-1">This field has an error</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Read Only</label>
              <Input value="Read only value" readOnly />
            </div>
          </Grid>
        </Card>

        {/* Post Type Selector (Radio Cards) */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Radio Card Selector</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Card-based radio selection with icons and descriptions. Used for post type selection.
          </p>
          <PostTypeSelector value={postType} onChange={setPostType} />
        </Card>

        {/* Inline Character Counter */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Inline Character Counter</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Counter positioned inside the input field. Use <code>pr-14</code> padding and{' '}
            <code>absolute right-3 top-1/2 -translate-y-1/2</code> for inputs,{' '}
            <code>absolute bottom-2 right-3</code> for textareas.
          </p>
          <Stack gap={2} className="max-w-md">
            {/* Input with inline counter */}
            <div>
              <label className="text-sm font-medium mb-2 block">NFT Name (32 max)</label>
              <div className="relative">
                <Input
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  placeholder="Enter name..."
                  maxLength={32}
                  className="pr-14"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                  {textValue.length} / 32
                </div>
              </div>
            </div>

            {/* Textarea with inline counter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Caption (2000 max)</label>
              <div className="relative">
                <Textarea
                  value={bioValue}
                  onChange={(e) => setBioValue(e.target.value)}
                  placeholder="Write a caption..."
                  maxLength={2000}
                  className="min-h-[100px] resize-none pb-7"
                />
                <div className="absolute bottom-2 right-3 text-xs text-muted-foreground pointer-events-none">
                  {bioValue.length} / 2000
                </div>
              </div>
            </div>
          </Stack>
        </Card>

        {/* Label with Tooltip */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Label with Tooltip</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Labels with dotted underline indicate additional info on hover.
          </p>
          <Stack gap={2} className="max-w-md">
            <div>
              <Tooltip content="Maximum number of editions that can be sold. Leave open edition for unlimited.">
                <label className="text-sm font-medium mb-2 block cursor-help border-b border-dotted border-muted-foreground/40 w-fit">
                  Maximum Supply
                </label>
              </Tooltip>
              <Input type="number" placeholder="100" />
            </div>
            <div>
              <Tooltip content="Royalties for secondary sales (0-10%).">
                <label className="text-sm font-medium mb-2 block cursor-help border-b border-dotted border-muted-foreground/40 w-fit">
                  Royalties
                </label>
              </Tooltip>
              <Input type="number" placeholder="5.00" />
            </div>
          </Stack>
        </Card>

        {/* Input with Inline Select */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Input with Inline Select</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Number input with currency selector positioned inside. Used for price fields.
          </p>
          <Stack gap={2} className="max-w-md">
            <div>
              <label className="text-sm font-medium mb-2 block">Price per edition</label>
              <div className="relative max-w-[200px]">
                <Input
                  type="number"
                  step="any"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="pr-20"
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2">
                  <Select value={currency} onValueChange={(v) => setCurrency(v as 'SOL' | 'USDC')}>
                    <SelectTrigger className="h-7 w-[70px] px-2 text-sm font-medium bg-muted dark:bg-zinc-700 border-0 shadow-none focus:ring-0 hover:bg-muted/80 dark:hover:bg-zinc-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SOL">SOL</SelectItem>
                      <SelectItem value="USDC">USDC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Stack>
        </Card>

        {/* Input with Suffix */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Input with Suffix</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Number input with unit suffix. Used for royalties percentage.
          </p>
          <Stack gap={2} className="max-w-md">
            <div>
              <label className="text-sm font-medium mb-2 block">Royalties</label>
              <Row gap={1.5} align="center">
                <Input
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  value={royalties}
                  onChange={(e) => setRoyalties(e.target.value)}
                  placeholder="0.00"
                  className="max-w-[120px]"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </Row>
              <p className="text-xs text-muted-foreground mt-1">0-10% for secondary sales</p>
            </div>
          </Stack>
        </Card>

        {/* Textarea */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Textarea</h2>
          <Stack gap={2} className="max-w-md">
            <div>
              <label className="text-sm font-medium mb-2 block">Default</label>
              <Textarea placeholder="Write something..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Fixed Height (min-h-[140px])</label>
              <Textarea placeholder="Bio textarea" className="min-h-[140px]" rows={6} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Disabled</label>
              <Textarea placeholder="Disabled" disabled />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Error State</label>
              <Textarea placeholder="Error state" aria-invalid="true" />
            </div>
          </Stack>
        </Card>

        {/* Switch/Toggle */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Switch</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Binary on/off control for settings and preferences.
          </p>
          <Stack gap={3} className="max-w-md">
            {/* States */}
            <Stack gap={2}>
              <h3 className="text-sm font-medium text-muted-foreground">States</h3>
              <Grid cols={2} gap={2}>
                <Row justify="between" align="center">
                  <Label>Off</Label>
                  <Switch checked={false} />
                </Row>
                <Row justify="between" align="center">
                  <Label>On</Label>
                  <Switch checked={true} />
                </Row>
                <Row justify="between" align="center">
                  <Label className="text-muted-foreground">Disabled (off)</Label>
                  <Switch checked={false} disabled />
                </Row>
                <Row justify="between" align="center">
                  <Label className="text-muted-foreground">Disabled (on)</Label>
                  <Switch checked={true} disabled />
                </Row>
              </Grid>
            </Stack>

            {/* Settings Pattern */}
            <Stack gap={2}>
              <h3 className="text-sm font-medium text-muted-foreground">Settings Pattern</h3>
              <SettingsToggle
                icon="fa-bell"
                label="Notifications"
                description="Receive push notifications"
              />
              <SettingsToggle
                icon="fa-moon"
                label="Dark mode"
                description="Use dark theme"
                defaultChecked={false}
              />
            </Stack>
          </Stack>
        </Card>

        {/* Checkbox */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Checkbox</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Used for multi-select options like report reasons or system theme preference.
          </p>
          <Stack gap={2} className="max-w-md">
            <Row gap={1.5} align="center">
              <Checkbox
                id="checkbox-demo"
                checked={checkboxChecked}
                onCheckedChange={(checked) => setCheckboxChecked(checked === true)}
              />
              <Label htmlFor="checkbox-demo" className="cursor-pointer">
                Use system theme
              </Label>
            </Row>
            <Row gap={1.5} align="center">
              <Checkbox id="checkbox-checked" checked={true} disabled />
              <Label htmlFor="checkbox-checked" className="cursor-not-allowed opacity-50">
                Disabled (checked)
              </Label>
            </Row>
            <Row gap={1.5} align="center">
              <Checkbox id="checkbox-unchecked" checked={false} disabled />
              <Label htmlFor="checkbox-unchecked" className="cursor-not-allowed opacity-50">
                Disabled (unchecked)
              </Label>
            </Row>
          </Stack>
        </Card>

      </Stack>
    </Region>
  )
}

function SettingsToggle({
  icon,
  label,
  description,
  defaultChecked = true,
}: {
  icon: string
  label: string
  description: string
  defaultChecked?: boolean
}) {
  const [checked, setChecked] = useState(defaultChecked)
  return (
    <Row justify="between" align="center" className="py-1">
      <Row gap={1.5} align="center">
        <Icon name={icon.replace('fa-', '')} variant="regular" className="w-4 text-center text-muted-foreground/70" />
        <div className="flex flex-col">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">{description}</span>
        </div>
      </Row>
      <Switch checked={checked} onCheckedChange={setChecked} />
    </Row>
  )
}
