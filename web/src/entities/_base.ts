

export type VersionedSerializableToStructFnReturnType = Record<string, any>

export type VersionedSerializableToStructFn = {
  struct: () => VersionedSerializableToStructFnReturnType
}

export interface VersionedSerializable {
  to: {
    latest: VersionedSerializableToStructFn
    [key: string]: VersionedSerializableToStructFn
  }
}

export type Modify<T, R> = Omit<T, keyof R> & R;

