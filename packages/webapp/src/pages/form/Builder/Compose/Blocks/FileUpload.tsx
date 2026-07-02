import { IconChevronRight, IconUpload } from '@tabler/icons-react'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { useFormStore } from '@/store'

import { FakeSubmit } from '../FakeSubmit'
import type { BlockProps } from './Block'
import { Block } from './Block'

export const FileUpload: FC<BlockProps> = ({ field, locale, ...restProps }) => {
  const { t } = useTranslation()
  const { form } = useFormStore()

  const maxUploadSizeMb = field.properties?.maxUploadSizeMb || form?.maxUploadSizeMb || 10
  const maxFileSizeStr = `${maxUploadSizeMb}MB`

  return (
    <Block className="heyform-file-upload" field={field} locale={locale} {...restProps}>
      <div className="heyform-file-uploader">
        <div className="heyform-upload-wrapper">
          <IconUpload className="heyform-upload-icon non-scaling-stroke" />
          <div className="mt-8">{t('Upload a file or drag and drop', { lng: locale })}</div>
          <div className="heyform-upload-size-limit">{t('Size limit', { lng: locale })}: {maxFileSizeStr}</div>
        </div>
      </div>
      <FakeSubmit text={t('Next', { lng: locale })} icon={<IconChevronRight />} />
    </Block>
  )
}
