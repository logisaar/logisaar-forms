import { startTransition, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { Input, Select } from '@/components'
import { useFormStore } from '@/store'

import { useStoreContext } from '../../store'
import { RequiredSettingsProps } from './Required'

export default function FileUploadSettings({ field }: RequiredSettingsProps) {
  const { t } = useTranslation()
  const { dispatch } = useStoreContext()
  const { form } = useFormStore()

  const formMaxUploadSizeMb = form?.maxUploadSizeMb || 5

  const handleChange = useCallback(
    (key: string, value: any) => {
      startTransition(() => {
        dispatch({
          type: 'updateField',
          payload: {
            id: field.id,
            updates: {
              properties: {
                ...field.properties,
                [key]: value
              }
            }
          }
        })
      })
    },
    [dispatch, field.id, field.properties]
  )

  const fileTypeOptions = [
    { value: 'all', label: 'Any file type' },
    { value: 'image', label: 'Images only' }
  ]

  return (
    <>
      <div className="space-y-1">
        <label className="text-sm/6 font-medium" htmlFor="#">
          Allowed file types
        </label>

        <Select
          className="w-full"
          value={field.properties?.allowOnlyImages ? 'image' : 'all'}
          options={fileTypeOptions}
          onChange={value => handleChange('allowOnlyImages', value === 'image')}
        />
      </div>

      <div className="space-y-1 mt-4">
        <label className="text-sm/6 font-medium" htmlFor="#">
          Max upload size per file (MB)
        </label>

        <Input
          type="number"
          min={1}
          max={50}
          placeholder={`${formMaxUploadSizeMb} MB (Form default)`}
          value={field.properties?.maxUploadSizeMb || ''}
          onChange={value => handleChange('maxUploadSizeMb', value ? Number(value) : undefined)}
        />
      </div>
    </>
  )
}
