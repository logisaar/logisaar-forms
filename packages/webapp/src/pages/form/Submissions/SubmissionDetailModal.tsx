import { FieldKindEnum, FormField } from '@heyform-inc/shared-types-enums'
import { IconCalendar, IconPrinter, IconCopy } from '@tabler/icons-react'
import { FC, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { helper } from '@heyform-inc/utils'
import { CURRENCY_SYMBOLS } from '@heyform-inc/answer-utils'
import Big from 'big.js'

import { formatDay, unixDate } from '@/utils'

import { Button, Modal, TableRef, TableState, useToast } from '@/components'
import { useModal } from '@/store'
import { SubmissionType } from '@/types'

import SubmissionCell, { SubmissionHeaderCell } from './SubmissionCell'

interface SubmissionItemProps {
  submission: SubmissionType
  field: FormField
}

interface SubmissionDetailPayload extends TableState {
  ref: TableRef<Any>
  submission: SubmissionType
  fields: FormField[]
}

interface SubmissionDetailProps {
  onClose: () => void
}

function getPlainAnswerText(field: FormField, answer: any): string {
  if (!answer || helper.isEmpty(answer.value)) {
    return ''
  }

  const val = answer.value
  switch (field.kind) {
    case FieldKindEnum.ADDRESS:
      if (helper.isObject(val)) {
        return [val.address1, val.address2, val.city, val.state, val.zip].filter(Boolean).join(', ')
      }
      break

    case FieldKindEnum.DATE_RANGE:
      if (helper.isObject(val)) {
        return [val.start, val.end].filter(Boolean).join(' - ')
      }
      break

    case FieldKindEnum.FILE_UPLOAD:
      if (helper.isObject(val)) {
        const filename = val.filename || 'file'
        const fileUrl = `${val.cdnUrlPrefix}/${val.cdnKey}`
        return `${filename} (${fileUrl})`
      } else if (helper.isString(val)) {
        const filename = val.split('/').pop() || 'file'
        return `${filename} (${val})`
      }
      break

    case FieldKindEnum.FULL_NAME:
      if (helper.isObject(val)) {
        return [val.firstName, val.lastName].filter(Boolean).join(' ')
      }
      break

    case FieldKindEnum.INPUT_TABLE:
      const columns = (field.properties?.tableColumns || []) as any[]
      if (Array.isArray(val) && columns.length > 0) {
        return val.map((row: any) => {
          if (helper.isObject(row)) {
            return columns.map(c => row[c.id]).join(', ')
          }
          return ''
        }).filter(Boolean).join(' | ')
      }
      break

    case FieldKindEnum.MULTIPLE_CHOICE:
    case FieldKindEnum.PICTURE_CHOICE:
      const choices = (field.properties?.choices || []) as any[]
      if (helper.isObject(val)) {
        const selected = choices.filter(c => val.value?.includes(c.id)).map(c => c.label)
        if (val.other) {
          selected.push(val.other)
        }
        return selected.join(', ')
      }
      break

    case FieldKindEnum.YES_NO:
      const yesNoChoices = (field.properties?.choices || []) as any[]
      const yesNoVal = helper.isObject(val) ? val.value : val
      const selectedYesNo = yesNoChoices.find(c => c.id === yesNoVal)
      return selectedYesNo ? selectedYesNo.label : String(yesNoVal)

    case FieldKindEnum.RATING:
    case FieldKindEnum.OPINION_SCALE:
      const total = field.properties?.total ?? (field.kind === FieldKindEnum.RATING ? 5 : 10)
      return `${val}/${total}`

    case FieldKindEnum.PAYMENT:
      if (helper.isObject(val)) {
        const amount = val.amount || 0
        const currencySymbol = CURRENCY_SYMBOLS[val.currency] || val.currency || '$'
        const amountStr = currencySymbol + Big(amount).div(100).toFixed(2)
        return `${amountStr} (${val.paymentIntentId ? 'Succeeded' : 'Incomplete'})`
      }
      break

    case FieldKindEnum.PHONE_NUMBER:
      if (helper.isObject(val)) {
        return val.isWhatsappSame
          ? `${val.phone} (WhatsApp same)`
          : `${val.phone} (WhatsApp: ${val.whatsapp || '-'})`
      }
      return String(val)

    case FieldKindEnum.LEGAL_TERMS:
      return val === true || val === 'true' ? 'Accepted' : 'Not accepted'

    default:
      return String(val)
  }

  return ''
}

const SubmissionItem: FC<SubmissionItemProps> = ({ submission, field }) => {
  const answer = submission.answers.find(ans => ans.id === field.id)
  const toast = useToast()
  const { t } = useTranslation()

  const handleCopyAnswer = () => {
    if (!answer) return
    const textToCopy = getPlainAnswerText(field, answer)
    if (!textToCopy) return

    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        toast({
          title: t('Copied'),
          message: t('Answer copied to clipboard!')
        })
      })
      .catch(err => {
        console.error('Failed to copy answer: ', err)
      })
  }

  return (
    <div className="group space-y-3 pt-4 text-sm/6">
      <div className="flex items-center justify-between">
        <SubmissionHeaderCell
          className="text-secondary items-start gap-x-2 [&_[data-slot=icon]]:h-5 [&_[data-slot=icon]]:w-5 [&_[data-slot=label]]:text-wrap [&_[data-slot=label]]:text-base/6 [&_[data-slot=label]]:font-medium [&_[data-slot=question-icon]]:h-6 [&_[data-slot=question-icon]]:w-6"
          field={field}
        />
        {answer && !helper.isEmpty(answer.value) && (
          <Button.Ghost
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity print:hidden !p-1.5"
            onClick={handleCopyAnswer}
            title={t('Copy answer')}
          >
            <IconCopy className="h-4 w-4" />
            <span className="sr-only">{t('Copy answer')}</span>
          </Button.Ghost>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {answer && <SubmissionCell field={field} submission={submission} answer={answer} />}
      </div>
    </div>
  )
}

const SubmissionDetail: FC<SubmissionDetailProps> = () => {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const { payload } = useModal<SubmissionDetailPayload>('SubmissionDetailModal')

  const fields = useMemo(
    () => (payload?.fields || []).filter(f => f.kind !== FieldKindEnum.SUBMIT_DATE),
    [payload?.fields]
  )

  const submitDate = useMemo(() => {
    if (payload?.fields && payload?.submission) {
      const value = payload.submission.answers.find(answer => answer.id === 'submit_date')?.value

      if (value) {
        return formatDay(unixDate(value), i18n.language)
      }
    }
  }, [i18n.language, payload?.fields, payload?.submission])

  function handlePrint() {
    window.print()
  }

  function handleCopy() {
    if (!payload?.submission || !fields) return

    const submission = payload.submission
    const lines = fields.map(field => {
      const answer = submission.answers.find(ans => ans.id === field.id)
      let title = field.title
      if (Array.isArray(title)) {
        title = title.map((item: any) => item.text || '').join('')
      }

      let answerText = ''
      if (answer && !helper.isEmpty(answer.value)) {
        const val = answer.value
        switch (field.kind) {
          case FieldKindEnum.ADDRESS:
            if (helper.isObject(val)) {
              answerText = [val.address1, val.address2, val.city, val.state, val.zip].filter(Boolean).join(', ')
            }
            break

          case FieldKindEnum.DATE_RANGE:
            if (helper.isObject(val)) {
              answerText = [val.start, val.end].filter(Boolean).join(' - ')
            }
            break

          case FieldKindEnum.FILE_UPLOAD:
            if (helper.isObject(val)) {
              const filename = val.filename || 'file'
              const fileUrl = `${val.cdnUrlPrefix}/${val.cdnKey}`
              answerText = `${filename} (${fileUrl})`
            } else if (helper.isString(val)) {
              const filename = val.split('/').pop() || 'file'
              answerText = `${filename} (${val})`
            }
            break

          case FieldKindEnum.FULL_NAME:
            if (helper.isObject(val)) {
              answerText = [val.firstName, val.lastName].filter(Boolean).join(' ')
            }
            break

          case FieldKindEnum.INPUT_TABLE:
            const columns = (field.properties?.tableColumns || []) as any[]
            if (Array.isArray(val) && columns.length > 0) {
              answerText = val.map((row: any) => {
                if (helper.isObject(row)) {
                  return columns.map(c => row[c.id]).join(', ')
                }
                return ''
              }).filter(Boolean).join(' | ')
            }
            break

          case FieldKindEnum.MULTIPLE_CHOICE:
          case FieldKindEnum.PICTURE_CHOICE:
            const choices = (field.properties?.choices || []) as any[]
            if (helper.isObject(val)) {
              const selected = choices.filter(c => val.value?.includes(c.id)).map(c => c.label)
              if (val.other) {
                selected.push(val.other)
              }
              answerText = selected.join(', ')
            }
            break

          case FieldKindEnum.YES_NO:
            const yesNoChoices = (field.properties?.choices || []) as any[]
            const yesNoVal = helper.isObject(val) ? val.value : val
            const selectedYesNo = yesNoChoices.find(c => c.id === yesNoVal)
            answerText = selectedYesNo ? selectedYesNo.label : String(yesNoVal)
            break

          case FieldKindEnum.RATING:
          case FieldKindEnum.OPINION_SCALE:
            const total = field.properties?.total ?? (field.kind === FieldKindEnum.RATING ? 5 : 10)
            answerText = `${val}/${total}`
            break

          case FieldKindEnum.PAYMENT:
            if (helper.isObject(val)) {
              const amount = val.amount || 0
              const currencySymbol = CURRENCY_SYMBOLS[val.currency] || val.currency || '$'
              const amountStr = currencySymbol + Big(amount).div(100).toFixed(2)
              answerText = `${amountStr} (${val.paymentIntentId ? 'Succeeded' : 'Incomplete'})`
            }
            break

          case FieldKindEnum.PHONE_NUMBER:
            if (helper.isObject(val)) {
              answerText = val.isWhatsappSame
                ? `${val.phone} (WhatsApp same)`
                : `${val.phone} (WhatsApp: ${val.whatsapp || '-'})`
            } else {
              answerText = String(val)
            }
            break

          case FieldKindEnum.LEGAL_TERMS:
            answerText = val === true || val === 'true' ? 'Accepted' : 'Not accepted'
            break

          default:
            answerText = String(val)
            break
        }
      }

      return `${title}: ${answerText || '-'}`
    })

    const textToCopy = lines.join('\n')
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        toast({
          title: t('Copied'),
          message: t('Submission details copied to clipboard!')
        })
      })
      .catch(err => {
        console.error('Failed to copy text: ', err)
      })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-end px-6 pb-2 pt-6">
        <div className="flex-1">
          <h1 className="text-primary text-2xl/8 font-semibold sm:text-xl/8">
            {t('form.submissions.detail.headline')}
          </h1>

          <div className="mt-4 flex flex-wrap gap-4">
            <span className="text-primary flex items-center gap-3 text-base/6 sm:text-sm/6">
              <IconCalendar className="text-secondary h-4 w-4" />
              <span>{submitDate}</span>
            </span>
          </div>
        </div>

        <div className="flex gap-2 print:opacity-0">
          {/*<Button.Ghost*/}
          {/*  size="sm"*/}
          {/*  disabled={payload?.loading || payload?.isPreviousDisabled}*/}
          {/*  iconOnly*/}
          {/*  onClick={payload?.ref?.toPrevious}*/}
          {/*>*/}
          {/*  <IconChevronUp className="h-5 w-5" />*/}
          {/*</Button.Ghost>*/}

          {/*<Button.Ghost*/}
          {/*  size="sm"*/}
          {/*  disabled={payload?.loading || payload?.isNextDisabled}*/}
          {/*  iconOnly*/}
          {/*  onClick={payload?.ref?.toNext}*/}
          {/*>*/}
          {/*  <IconChevronDown className="h-5 w-5" />*/}
          {/*</Button.Ghost>*/}

          <Button.Ghost size="sm" onClick={handleCopy}>
            <IconCopy className="h-5 w-5" />
            <span>{t('components.copy', 'Copy')}</span>
          </Button.Ghost>

          <Button.Ghost size="sm" onClick={handlePrint}>
            <IconPrinter className="h-5 w-5" />
            <span>{t('components.print')}</span>
          </Button.Ghost>
        </div>
      </div>

      <div className="scrollbar flex-1 overflow-y-auto px-6 pb-12">
        <div className="divide-accent-light space-y-4 divide-y">
          {fields.map(field => (
            <SubmissionItem key={field.id} submission={payload?.submission} field={field} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function SubmissionDetailModal({ onClose }: SubmissionDetailProps) {
  const { isOpen } = useModal('SubmissionDetailModal')

  function handleOpenChange(open: boolean) {
    if (!open) {
      onClose?.()
    }
  }

  return (
    <Modal
      open={isOpen}
      contentProps={{
        className: 'max-w-2xl !p-0'
      }}
      onOpenChange={handleOpenChange}
    >
      <SubmissionDetail onClose={() => handleOpenChange(false)} />
    </Modal>
  )
}
