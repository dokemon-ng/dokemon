import { Terminal } from "@xterm/xterm"
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { loader } from "@monaco-editor/react"
import { toast } from "@/components/ui/use-toast"

export const REGEX_IDENTIFIER = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/
export const REGEX_IDENTIFIER_MESSAGE =
  "Only alphabets, digits, _ and -. Must start with an alphabet or digit."

export const CLASSES_TABLE_ACTION_ICON = "w-4 text-slate-900 dark:text-white"
export const CLASSES_CLICKABLE_TABLE_ROW =
  "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function convertByteToMb(size: number) {
  return (size / (1000 * 1000)).toFixed(2) + " MB"
}

export function trimString(u: unknown) {
  return typeof u === "string" ? u.trim() : u
}

export function getContainerUrlFromPortMapping(
  portMapping: string,
  containerBaseUrl: string | null
) {
  const lastColonIndex = portMapping.lastIndexOf(":")
  const parts = portMapping.substring(lastColonIndex + 1).split("-")

  if (parts.length <= 1) {
    return null
  }

  const publicPort = parts[0]
  let hostname = portMapping.substring(0, lastColonIndex)

  let baseUrl = containerBaseUrl
  if (hostname === "0.0.0.0" || hostname == "::") {
    if (!baseUrl) {
      baseUrl = `${location.protocol}//${location.hostname}`
    }
    hostname = location.hostname
  } else {
    baseUrl = `${location.protocol}//${hostname}`
  }

  return `${baseUrl}:${publicPort}`
}

export function recreateTerminalElement(
  containerId: string,
  elementId: string
) {
  const elContainer = document.getElementById(containerId)
  if (elContainer) {
    const el = document.getElementById(elementId)
    if (el) {
      elContainer.removeChild(el)
    }
    const newEl = document.createElement("div")
    newEl.setAttribute("id", "terminal")
    elContainer.appendChild(newEl)
    return newEl
  }

  return null
}

export function newTerminal(convertToEol?: boolean) {
  if (convertToEol === undefined || convertToEol === null) {
    convertToEol = true
  }

  return new Terminal({
    theme: {
      background: "#0f172a",
    },
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    fontWeight: 100,
    cursorBlink: true,
    allowProposedApi: true,
    convertEol: convertToEol,
    rows: 28,
  })
}


export function downloadTerminalTextAsFile(
  terminal: Terminal,
  filename: string
) {
  let text = ""
  const l = terminal.buffer.normal.length
  for (let i = 0; i < l; i++) {
    const line = terminal.buffer.normal.getLine(i)?.translateToString(true)
    text += `${line}\r\n`
  }

  download(filename, text)
}

export function initMonaco() {
  loader.init().then((monaco) => {
    monaco.editor.defineTheme("dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#000000",
      },
    })
  })
}

export async function hasUniqueName(apiUrl: string) {
  const res = await fetch(apiUrl)
  return (await res.json()).unique
}

export function toastSuccess(message: string) {
  toast({
    title: "Success!",
    description: message,
  })
}

export function toastSomethingWentWrong(message: string) {
  toast({
    variant: "destructive",
    title: "Something went wrong.",
    description: message,
  })
}

export function toastFailed(message: string) {
  toast({
    variant: "destructive",
    title: "Failed!",
    description: message,
  })
}

export function download(filename: string, text: string) {
  const element = document.createElement("a")
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text)
  )
  element.setAttribute("download", filename)

  element.style.display = "none"
  document.body.appendChild(element)

  element.click()

  document.body.removeChild(element)
}


export function printDokemonLogo(t: Terminal) {
  const logo = `
              ##         .
        ## ## ##        ==
     ## ## ## ## ##    ===
 /""""""""""""""""\\___/ ===
{                       /  ===-
 \\______ O           __/
  \\    \\         __/
   \\____\\_______/
  ____||____||____
 /____||____||____
`
  t.writeln(logo)
}
