import {
  Answer,
  FieldKindEnum,
  FormField,
  HiddenField,
  STATEMENT_FIELD_KINDS
} from '@heyform-inc/shared-types-enums'
import { Injectable } from '@nestjs/common'
import { parse } from 'json2csv'

import { APP_HOMEPAGE_URL } from '@environments'
import { htmlUtils, parsePlainAnswer } from '@heyform-inc/answer-utils'
import { helper, unixDate } from '@heyform-inc/utils'
import { SubmissionModel } from '@model'

const FIELD_ID_KEY = '#'
const START_DATE_KEY = 'Start Date (UTC)'
const SUBMIT_DATE_KEY = 'Submit Date (UTC)'

@Injectable()
export class ExportFileService {
  async csv(
    formFields: FormField[],
    selectedHiddenFields: HiddenField[],
    submissions: SubmissionModel[]
  ): Promise<string> {
    const records: Record<string, any>[] = []
    const selectedFormFields = (formFields || [])
      .filter(field => !STATEMENT_FIELD_KINDS.includes(field.kind))
      .map(field => {
        let title = field.title
        if (helper.isArray(title)) {
          title = htmlUtils.serialize(title)
        }
        title = htmlUtils.plain(title || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
        return {
          ...field,
          title
        }
      })

    const fields: string[] = [
      FIELD_ID_KEY,
      ...selectedFormFields.map(field => field.title),
      ...(selectedHiddenFields || []).map(hiddenField => hiddenField.name.replace(/\u00a0/g, ' ').trim()),
      START_DATE_KEY,
      SUBMIT_DATE_KEY
    ]

    for (const submission of submissions) {
      const record: Record<string, any> = {
        [FIELD_ID_KEY]: submission.id
      }

      for (const field of selectedFormFields) {
        let answer: any = submission.answers.find(answer => answer.id === field.id)

        if (helper.isEmpty(answer)) {
          answer = ''
        } else {
          answer = this.parseAnswer(answer)
        }

        record[field.title] = answer
      }

      for (const selectedHiddenField of selectedHiddenFields || []) {
        const hiddenFieldValue = submission.hiddenFields.find(
          hiddenField => hiddenField.id === selectedHiddenField.id
        )?.value

        record[selectedHiddenField.name.replace(/\u00a0/g, ' ').trim()] = hiddenFieldValue
      }

      record[START_DATE_KEY] = submission.startAt ? unixDate(submission.startAt!).toISOString() : ''
      record[SUBMIT_DATE_KEY] = submission.startAt ? unixDate(submission.endAt!).toISOString() : ''

      records.push(record)
    }

    const csvContent = parse(records, {
      fields
    })

    return `\ufeff${csvContent}`
  }

  private parseAnswer(answer: Answer): string {
    const value = answer.value
    let result = ''

    if (helper.isEmpty(value)) {
      return result
    }

    switch (answer?.kind) {
      case FieldKindEnum.FILE_UPLOAD:
        if (helper.isObject(value)) {
          result = (value.cdnUrlPrefix && value.cdnKey)
            ? `${value.cdnUrlPrefix}/${value.cdnKey}`
            : (value.url || '')
        } else if (helper.isString(value)) {
          const pathParts = value.split('/')
          const filename = pathParts.pop() || ''
          const formId = pathParts.pop() || ''

          if (value.startsWith('/static/upload/') && formId && filename && formId !== 'global') {
            result = `${APP_HOMEPAGE_URL.replace(/\/$/, '')}/view/file/${formId}/${filename}`
          } else {
            const url = value.startsWith('/') ? value : `/${value}`
            result = `${APP_HOMEPAGE_URL.replace(/\/$/, '')}${url}`
          }
        }
        break

      default:
        result = parsePlainAnswer(answer)
        break
    }

    return result
  }
}
