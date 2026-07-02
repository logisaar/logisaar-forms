import { IconFile, IconUpload } from '@tabler/icons-react'
import clsx from 'clsx'
import type { FC } from 'react'
import { useState } from 'react'

import { isFile, stopPropagation, useTranslation } from '../utils'
import { formatBytes } from '@heyform-inc/utils'
import { useStore } from '../store'
import { FormField } from '@heyform-inc/shared-types-enums'

import { ACCEPTED_FILE_MIMES } from '../consts'
import { IComponentProps } from '../typings'

interface FileUploaderProps extends Omit<IComponentProps, 'onChange'> {
  value?: File
  onChange?: (file: File) => void
  field?: FormField
}

export const FileUploader: FC<FileUploaderProps> = ({ value, onChange, field }) => {
  const { t } = useTranslation()
  const { state } = useStore()

  const maxUploadSizeMb = field?.properties?.maxUploadSizeMb || state.maxUploadSizeMb || 10
  const maxBytes = maxUploadSizeMb * 1024 * 1024
  const maxFileSizeStr = `${maxUploadSizeMb}MB`

  const allowedMimes = field?.properties?.allowOnlyImages
    ? ['image/jpeg', 'image/png', 'image/bmp', 'image/gif']
    : ACCEPTED_FILE_MIMES

  const [error, setError] = useState<string>()
  const [fileInputRef, setFileInputRef] = useState<any>()
  const [dragZoneRef, setDragZoneRef] = useState<any>()
  const [dragoverRef, setDragoverRef] = useState<any>()
  const [dragging, setDragging] = useState(false)

  function handleFileChange(file?: File) {
    let newValue: any = file

    if (file) {
      if (!allowedMimes.includes(file.type)) {
        newValue = undefined
        setError(t('File type is not supported'))
      } else if (file.size > maxBytes) {
        newValue = undefined
        setError(t("File size can't exceed {{size}}", { size: maxFileSizeStr }))
      } else if (file.size === 0) {
        newValue = undefined
        setError(t('Files should not be empty'))
      }
    }

    onChange?.(newValue)
  }

  function handleDrop(event: any) {
    event.preventDefault()

    if (event.type === 'dragenter') {
      setDragoverRef(event.target)
      setDragging(true)
      return
    }

    if (event.type === 'dragleave') {
      if (event.target === dragZoneRef && event.target === dragoverRef) {
        setDragging(false)
      }
      return
    }

    if (event.type === 'dragover') {
      return
    }

    setDragoverRef(undefined)
    setDragging(false)

    handleFileChange(event.dataTransfer.files[0])
  }

  function handleInputChange(event: any) {
    const { files } = event.target
    handleFileChange(files[0] ? files[0] : undefined)

    if (fileInputRef) {
      fileInputRef.value = null
    }
  }

  function handleClick(event: any) {
    stopPropagation(event)
    fileInputRef?.click()
  }

  return (
    <div
      className={clsx('heyform-file-uploader', {
        'heyform-file-uploader-dragging': dragging
      })}
      ref={setDragZoneRef}
      onDrop={handleDrop}
      onDragOver={handleDrop}
      onDragEnter={handleDrop}
      onDragLeave={handleDrop}
      onClick={handleClick}
    >
      <div className="heyform-upload-wrapper">
        {isFile(value) ? (
          <>
            <IconFile className="heyform-upload-icon" />
            <div className="heyform-upload-file mt-8">
              {value!.name} ({formatBytes(value!.size)})
            </div>
            <div className="heyform-upload-reselect">
              <span>{t('Re-select file')}</span>
            </div>
          </>
        ) : (
          <>
            <IconUpload className="heyform-upload-icon" />
            <div className="mt-8">{t('Upload a file or drag and drop')}</div>
            {error ? (
              <div className="heyform-validation-error mt-1">{error}</div>
            ) : (
              <div className="heyform-upload-size-limit">
                {t('Size limit')}: {maxFileSizeStr}
              </div>
            )}
          </>
        )}
      </div>
      <input
        type="file"
        ref={setFileInputRef}
        style={{ display: 'none' }}
        accept={allowedMimes.join(',')}
        onClick={stopPropagation}
        onChange={handleInputChange}
      />
    </div>
  )
}
