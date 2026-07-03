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
        if (form.settings?.metaOGImageUrl) {
          ogImage = form.settings.metaOGImageUrl
        } else {
          // If no custom OG image is uploaded, fall back to apple-touch-icon.png
          const host = req.headers.host || 'forms.logisaar.in'
          const protocol = req.headers['x-forwarded-proto'] || 'https'
          ogImage = `${protocol}://${host}/static/apple-touch-icon.png`
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
