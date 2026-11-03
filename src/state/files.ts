/**
 * Getting files out of and into the app. On phones the share sheet is the natural way out
 * (WhatsApp, email, AirDrop, Files/iCloud); browsers without it get a normal download.
 */
export async function deliverFile(file: File, title: string): Promise<void> {
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    // Cancelling the share sheet is a normal choice, not an error.
    await navigator.share({ files: [file], title }).then(undefined, (reason: unknown) => {
      if (!(reason instanceof DOMException && reason.name === 'AbortError')) throw reason;
    });
    return;
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
}

export function jsonFile(data: unknown, fileName: string): File {
  return new File([JSON.stringify(data)], fileName, { type: 'application/json' });
}

/** Parse a user-picked file as JSON; rejects with a SyntaxError when it isn't JSON. */
export async function readJsonFile(file: File): Promise<unknown> {
  return new Response(await file.text()).json() as Promise<unknown>;
}

/** Message for a file that could not be imported. Validators throw Errors with user-facing text. */
export function importErrorMessage(reason: unknown, wrongFileText: string): string {
  if (reason instanceof SyntaxError) return wrongFileText;
  if (reason instanceof Error) return reason.message;
  return 'Could not read the file.';
}

/** "Push Day!" → "push-day", for readable file names. */
export function slugify(text: string): string {
  const slug = text
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return slug === '' ? 'template' : slug;
}
