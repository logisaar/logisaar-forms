import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { extname } from 'path'
import { memoryStorage } from 'multer'
import { nanoid } from '@heyform-inc/utils'

import { COOKIE_DEVICE_ID_NAME } from '@config'
import { UPLOAD_FILE_SIZE, UPLOAD_FILE_TYPES } from '@environments'
import { helper } from '@heyform-inc/utils'
import { AuthService, EndpointService, FormService, StorageService } from '@service'
import { isAllowedUploadField } from '@utils'

const BLOCKED_UPLOAD_EXTENSIONS = new Set(['.svg', '.svgz'])
const BLOCKED_UPLOAD_MIME_TYPES = new Set(['image/svg+xml', 'application/svg+xml'])

function getUploadContextValue(
  req: any,
  key: 'fieldId' | 'formId' | 'openToken'
): string | undefined {
  const headerName = `x-heyform-${key.replace(/[A-Z]/g, matched => `-${matched.toLowerCase()}`)}`
  const value = req.get?.(headerName) || req.query?.[key]
  return Array.isArray(value) ? value[0] : value
}

@Controller()
export class UploadController {
  constructor(
    private readonly authService: AuthService,
    private readonly endpointService: EndpointService,
    private readonly formService: FormService,
    private readonly storageService: StorageService
  ) {}

  @Post('/api/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: UPLOAD_FILE_SIZE
      },
      storage: memoryStorage()
    })
  )
  async index(
    @Req() req: any,
    @UploadedFile() file: any
  ): Promise<{ filename: string; url: string; size: number }> {
    if (!file) {
      throw new BadRequestException('No upload file provided')
    }

    this.assertFileTypeAllowed(file)
    await this.assertUploadAllowed(req)

    const formId = getUploadContextValue(req, 'formId')
    let provider: 'vps' | 's3' = 'vps'
    let maxUploadSizeMb = 5

    if (helper.isValid(formId)) {
      const form = await this.formService.findById(formId)
      if (form) {
        provider = (form.storageProvider || 'vps') as 'vps' | 's3'
        maxUploadSizeMb = form.maxUploadSizeMb || 5
      }
    }

    if (file.size > maxUploadSizeMb * 1024 * 1024) {
      throw new BadRequestException(`File exceeds the ${maxUploadSizeMb}MB limit set for this form`)
    }

    const filename = `${nanoid(12)}${extname(file.originalname)}`
    const url = await this.storageService.uploadFile(
      file.buffer,
      filename,
      file.mimetype,
      formId || 'global',
      provider
    )

    return {
      filename: file.originalname,
      size: file.size,
      url
    }
  }

  private assertFileTypeAllowed(file: any): void {
    const extension = extname(file.originalname).toLowerCase()
    const mimeType = String(file.mimetype || '').toLowerCase()

    if (
      BLOCKED_UPLOAD_EXTENSIONS.has(extension) ||
      BLOCKED_UPLOAD_MIME_TYPES.has(mimeType) ||
      !UPLOAD_FILE_TYPES.includes(mimeType)
    ) {
      throw new BadRequestException(`Unsupported file type ${extname(file.originalname)}`)
    }
  }

  private async assertUploadAllowed(req: any): Promise<void> {
    if (await this.isAuthenticatedRequest(req)) {
      return
    }

    const fieldId = getUploadContextValue(req, 'fieldId')
    const formId = getUploadContextValue(req, 'formId')
    const openToken = getUploadContextValue(req, 'openToken')

    if (!helper.isValid(formId) || !helper.isValid(openToken) || !helper.isValid(fieldId)) {
      throw new BadRequestException('Invalid upload context')
    }

    const token = this.endpointService.decryptToken(openToken)

    if (token.formId !== formId) {
      throw new BadRequestException('Invalid upload context')
    }

    const form = await this.formService.findById(formId)

    if (!form || form.suspended || form.settings?.active !== true) {
      throw new BadRequestException('The form is not available')
    }

    if (!isAllowedUploadField(form, fieldId)) {
      throw new BadRequestException('The upload field is not allowed')
    }
  }

  private async isAuthenticatedRequest(req: any): Promise<boolean> {
    const session = this.authService.getSession(req)
    const deviceId = req.get('x-device-id') || req.cookies?.[COOKIE_DEVICE_ID_NAME]

    if (
      helper.isEmpty(session?.id) ||
      helper.isEmpty(session?.deviceId) ||
      deviceId !== session.deviceId
    ) {
      return false
    }

    return !(await this.authService.isExpired(session.id, session.deviceId))
  }

  @Get('/view/file/:formId/:filename')
  async viewFile(
    @Param('formId') formId: string,
    @Param('filename') filename: string,
    @Req() req: any,
    @Res() res: any
  ): Promise<void> {
    const authenticated = await this.isAuthenticatedRequest(req)
    if (!authenticated) {
      return res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`)
    }

    const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(filename)
    const previewContent = isImage
      ? `<img src="/static/upload/${formId}/${filename}" class="preview-image" alt="${filename}">`
      : `
       <div style="padding: 3rem; text-align: center;">
         <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 1rem;"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
         <p style="color: #9ca3af; font-size: 0.95rem;">No preview available for this file type</p>
       </div>
      `

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>View File - ${filename}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background-color: #0b0f19;
          color: #f3f4f6;
          height: 100vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .header {
          background: rgba(17, 24, 39, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 1rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 10;
        }
        .title {
          font-size: 0.95rem;
          font-weight: 500;
          color: #e5e7eb;
          max-width: 50%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .actions {
          display: flex;
          gap: 0.75rem;
        }
        .btn {
          background: rgba(255, 255, 255, 0.05);
          color: #f3f4f6;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s ease;
        }
        .btn:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .btn-primary {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }
        .btn-primary:hover {
          background: #2563eb;
          border-color: #2563eb;
        }
        .viewer-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          overflow: auto;
          background: radial-gradient(circle at center, #111827 0%, #030712 100%);
        }
        .image-wrapper {
          max-width: 90%;
          max-height: 90%;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: #0b0f19;
        }
        .preview-image {
          display: block;
          max-width: 100%;
          max-height: calc(100vh - 160px);
          object-fit: contain;
        }
        @media print {
          .header {
            display: none;
          }
          body, .viewer-container {
            background: white;
          }
          .image-wrapper {
            box-shadow: none;
            border: none;
            max-width: 100%;
            max-height: 100%;
          }
          .preview-image {
            max-height: 100%;
            max-width: 100%;
          }
        }
      </style>
    </head>
    <body>
      <header class="header">
        <div class="title" title="${filename}">${filename}</div>
        <div class="actions">
          <a href="/static/upload/${formId}/${filename}?attname=${encodeURIComponent(filename)}" class="btn btn-primary" download="${filename}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Download
          </a>
          <button onclick="window.print()" class="btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Print
          </button>
          <a href="/static/upload/${formId}/${filename}" target="_blank" class="btn">
            Open Original
          </a>
        </div>
      </header>
      <main class="viewer-container">
        <div class="image-wrapper">
          ${previewContent}
        </div>
      </main>
    </body>
    </html>
    `

    res.header('Content-Type', 'text/html')
    res.send(html)
  }
}
