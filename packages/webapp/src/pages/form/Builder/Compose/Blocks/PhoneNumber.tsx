import { COUNTRIES, FlagIcon } from '@heyform-inc/form-renderer'
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import type { FC } from 'react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { FakeSubmit } from '../FakeSubmit'
import type { BlockProps } from './Block'
import { Block } from './Block'

export const PhoneNumber: FC<BlockProps> = ({ field, locale, ...restProps }) => {
  const { t } = useTranslation()
  const placeholder = useMemo(
    () => COUNTRIES.find(c => c.value === field.properties?.defaultCountryCode)?.example,
    [field.properties?.defaultCountryCode]
  )

  const allowWhatsapp = (field.properties as any)?.allowWhatsapp

  return (
    <Block className="heyform-phone-number" field={field} locale={locale} {...restProps}>
      <div className="flex items-center">
        <div className="heyform-calling-code">
          <FlagIcon countryCode={field.properties?.defaultCountryCode} />
          <IconChevronDown className="heyform-phone-arrow-icon" />
        </div>
        <input type="text" className="heyform-input" placeholder={placeholder} disabled={true} />
      </div>

      {allowWhatsapp && (
        <div className="heyform-whatsapp-question mt-6 pt-4 border-t border-zinc-200/10 dark:border-zinc-800/50">
          <label className="block text-sm font-medium mb-3 text-secondary-DEFAULT opacity-60">
            {t('Is your phone number your WhatsApp number?')}
          </label>
          <div className="flex gap-3 mb-6">
            <button
              type="button"
              className="flex-1 py-3 px-4 rounded-lg border text-sm font-medium border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 bg-transparent disabled:cursor-default"
              disabled
            >
              {t('Yes')}
            </button>
            <button
              type="button"
              className="flex-1 py-3 px-4 rounded-lg border text-sm font-medium border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 bg-transparent disabled:cursor-default"
              disabled
            >
              {t('No')}
            </button>
          </div>
        </div>
      )}

      <FakeSubmit text={t('Next', { lng: locale })} icon={<IconChevronRight />} />
    </Block>
  )
}
