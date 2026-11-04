export type Result<T, E> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E }

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value })

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error })

export const valueOr = <T, E>(result: Result<T, E>, fallback: T): T => (result.ok ? result.value : fallback)

export const attemptSync = <T, E>(run: () => T, toError: (cause: unknown) => E): Result<T, E> => {
  try {
    return ok(run())
  } catch (cause) {
    return err(toError(cause))
  }
}

export const attempt = async <T, E>(run: () => Promise<T>, toError: (cause: unknown) => E): Promise<Result<T, E>> => {
  try {
    return ok(await run())
  } catch (cause) {
    return err(toError(cause))
  }
}
