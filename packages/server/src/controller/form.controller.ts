import { Controller, Get, Param, Req, Res } from '@nestjs/common'
import { Request, Response } from 'express'
import { FormService } from '../service'

import {
  APP_HOMEPAGE_URL,
  COOKIE_DOMAIN,
  ENABLE_GOOGLE_FONTS,
  GOOGLE_RECAPTCHA_KEY,
  STRIPE_PUBLISHABLE_KEY
} from '@environments'

@Controller()
export class FormController {
  constructor(private readonly formService: FormService) {}

  @Get('/form/:formId')
  async index(@Param('formId') formId: string, @Req() req: Request, @Res() res: Response) {
    let form: any = null
    let ogImage: string | null = null

    try {
      form = await this.formService.findById(formId)
      if (form) {
        let metaOGImageUrl = form.settings?.metaOGImageUrl
        if (metaOGImageUrl) {
          if (!metaOGImageUrl.startsWith('http://') && !metaOGImageUrl.startsWith('https://')) {
            const host = req.headers.host || 'forms.logisaar.in'
            const protocol = req.headers['x-forwarded-proto'] || 'https'
            
            // Normalize path by stripping initial slash
            if (metaOGImageUrl.startsWith('/')) {
              metaOGImageUrl = metaOGImageUrl.substring(1)
            }
            ogImage = `${protocol}://${host}/${metaOGImageUrl}`
          } else {
            ogImage = metaOGImageUrl
          }
        } else {
          // If no custom OG image is uploaded, fall back to og.png
          const host = req.headers.host || 'forms.logisaar.in'
          const protocol = req.headers['x-forwarded-proto'] || 'https'
          ogImage = `${protocol}://${host}/static/og.png`
        }
      }
    } catch (err) {
      console.error('Error fetching form metadata for SEO:', err)
    }

    return res.render('index', {
      form,
      ogImage,
      heyform: {
        homepageURL: APP_HOMEPAGE_URL,
        websiteURL: APP_HOMEPAGE_URL,
        cookieDomain: COOKIE_DOMAIN,
        enableGoogleFonts: ENABLE_GOOGLE_FONTS,
        stripePublishableKey: STRIPE_PUBLISHABLE_KEY,
        googleRecaptchaKey: GOOGLE_RECAPTCHA_KEY
      }
    })
  }
}
