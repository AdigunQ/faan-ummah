'use client'

type ConfirmDeleteButtonProps = {
  memberName: string
}

export default function ConfirmDeleteButton({ memberName }: ConfirmDeleteButtonProps) {
  return (
    <button
      type="submit"
      onClick={(event) => {
        const firstCheck = window.confirm(`Delete ${memberName}?`)
        if (!firstCheck) {
          event.preventDefault()
          return
        }

        const secondCheck = window.confirm('This action is permanent and will remove related records. Continue?')
        if (!secondCheck) {
          event.preventDefault()
        }
      }}
      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
    >
      Delete Member
    </button>
  )
}
