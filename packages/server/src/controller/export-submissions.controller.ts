import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common'
import { Response } from 'express'

import { Auth, FormGuard } from '@decorator'
import { ExportSubmissionsDto } from '@dto'
import { flattenFields } from '@heyform-inc/answer-utils'
import { date } from '@heyform-inc/utils'
import { ExportFileService, FormService, SubmissionService } from '@service'

@Controller()
@Auth()
export class ExportSubmissionsController {
  constructor(
    private readonly submissionService: SubmissionService,
    private readonly formService: FormService,
    private readonly exportFileService: ExportFileService
  ) {}

  @Get('/api/export/submissions')
  @FormGuard()
  async exportSubmissions(
    @Query() input: ExportSubmissionsDto,
    @Res() res: Response
  ): Promise<void> {
    try {
      const form = await this.formService.findById(input.formId)
      if (!form) {
        res.status(400).json({ message: 'The form does not exist' })
        return
      }

      const submissions = await this.submissionService.findAllByForm(input.formId)
      if (submissions.length < 1) {
        res.status(400).json({ message: 'The submissions do not exist' })
        return
      }

      const data = await this.exportFileService.csv(
        flattenFields(form.fields),
        form.hiddenFields,
        submissions
      )
      const dateStr = date().format('YYYY-MM-DD')
      const filename = `${encodeURIComponent(form.name)}-${dateStr}.csv`

      res.header('Content-Disposition', `attachment; filename="${filename}"`)
      res.send(data)
    } catch (err: any) {
      res.status(500).json({ message: err.message || 'Internal server error' })
    }
  }
}
