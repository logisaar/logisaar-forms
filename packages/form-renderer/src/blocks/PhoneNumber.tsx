import clsx from 'clsx'
import { isValidPhoneNumber } from 'libphonenumber-js'
import type { FC } from 'react'
import { useState, useMemo } from 'react'

import { useTranslation } from '../utils'
import { helper } from '@heyform-inc/utils'

import { FormField, PhoneNumberInput } from '../components'
import { useStore } from '../store'
import type { BlockProps } from './Block'
import { Block } from './Block'
import { Form } from './Form'

export const PhoneNumber: FC<BlockProps> = ({ field, ...restProps }) => {
  const { state } = useStore()
  const { t } = useTranslation()
  const [isDropdownShown, setIsDropdownShown] = useState(false)

  const initialVal = state.values[field.id]
  const initialPhone = helper.isObject(initialVal) ? (initialVal.phone || '') : (helper.isString(initialVal) ? initialVal : '')
  const initialIsWhatsappSame = helper.isObject(initialVal) ? (initialVal.isWhatsappSame !== false) : true
  const initialWhatsapp = helper.isObject(initialVal) ? (initialVal.whatsapp || '') : ''

  const [isWhatsappSame, setIsWhatsappSame] = useState(initialIsWhatsappSame)

  function getValues(values: any) {
    if ((field.properties as any)?.allowWhatsapp) {
      return {
        phone: values.phone,
        isWhatsappSame: isWhatsappSame,
        whatsapp: isWhatsappSame ? values.phone : values.whatsapp
      }
    }
    return values.input
  }

  const initialValues = useMemo(() => {
    if ((field.properties as any)?.allowWhatsapp) {
      return {
        phone: initialPhone,
        whatsapp: initialWhatsapp
      }
    }
    return {
      input: initialVal
    }
  }, [(field.properties as any)?.allowWhatsapp, initialPhone, initialWhatsapp, initialVal])

  return (
    <Block
      className={clsx('heyform-phone-number', {
        'heyform-dropdown-visible': isDropdownShown
      })}
      field={field}
      isScrollable={!isDropdownShown}
      {...restProps}
    >
      <Form
        initialValues={initialValues}
        field={field}
        getValues={getValues}
      >
        {!((field.properties as any)?.allowWhatsapp) ? (
          <FormField
            name="input"
            rules={[
              {
                required: field.validations?.required,
                validator(rule, value) {
                  return new Promise<void>((resolve, reject) => {
                    if (!rule.required && helper.isEmpty(value)) {
                      return resolve()
                    }

                    if (isValidPhoneNumber(value)) {
                      resolve()
                    } else {
                      reject(rule.message)
                    }
                  })
                },
                message: t('This field is required')
              }
            ]}
          >
            <PhoneNumberInput
              defaultCountryCode={field.properties?.defaultCountryCode}
              onDropdownVisibleChange={setIsDropdownShown}
            />
          </FormField>
        ) : (
          <div className="space-y-6">
            <div>
              <FormField
                name="phone"
                rules={[
                  {
                    required: field.validations?.required,
                    validator(rule, value) {
                      return new Promise<void>((resolve, reject) => {
                        if (!rule.required && helper.isEmpty(value)) {
                          return resolve()
                        }

                        if (helper.isString(value) && isValidPhoneNumber(value)) {
                          resolve()
                        } else {
                          reject(rule.message)
                        }
                      })
                    },
                    message: t('This field is required')
                  }
                ]}
              >
                <PhoneNumberInput
                  defaultCountryCode={field.properties?.defaultCountryCode}
                  onDropdownVisibleChange={setIsDropdownShown}
                />
              </FormField>
            </div>

            <div className="heyform-whatsapp-question pt-4 border-t border-zinc-200/10 dark:border-zinc-800/50">
              <label className="block text-sm font-medium mb-3 text-secondary-DEFAULT">
                {t('Is your phone number your WhatsApp number?')}
              </label>
              <div className="flex gap-3 mb-6">
                <button
                  type="button"
                  className={clsx(
                    "flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-all duration-200 cursor-pointer text-center",
                    isWhatsappSame
                      ? "bg-brand text-white border-brand shadow-sm shadow-brand/20"
                      : "border-zinc-200 text-zinc-500 hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-400"
                  )}
                  onClick={() => setIsWhatsappSame(true)}
                >
                  {t('Yes')}
                </button>
                <button
                  type="button"
                  className={clsx(
                    "flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-all duration-200 cursor-pointer text-center",
                    !isWhatsappSame
                      ? "bg-brand text-white border-brand shadow-sm shadow-brand/20"
                      : "border-zinc-200 text-zinc-500 hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-400"
                  )}
                  onClick={() => setIsWhatsappSame(false)}
                >
                  {t('No')}
                </button>
              </div>

              {!isWhatsappSame && (
                <div className="heyform-whatsapp-input-wrapper animate-fadeIn mt-4">
                  <label className="block text-sm font-medium mb-3 text-secondary-DEFAULT">
                    {t('WhatsApp number')}
                  </label>
                  <FormField
                    name="whatsapp"
                    rules={[
                      {
                        required: field.validations?.required,
                        validator(rule, value) {
                          return new Promise<void>((resolve, reject) => {
                            if (!rule.required && helper.isEmpty(value)) {
                              return resolve()
                            }

                            if (helper.isString(value) && isValidPhoneNumber(value)) {
                              resolve()
                            } else {
                              reject(rule.message)
                            }
                          })
                        },
                        message: t('This field is required')
                      }
                    ]}
                  >
                    <PhoneNumberInput
                      defaultCountryCode={field.properties?.defaultCountryCode}
                      onDropdownVisibleChange={setIsDropdownShown}
                    />
                  </FormField>
                </div>
              )}
            </div>
          </div>
        )}
      </Form>
    </Block>
  )
}
