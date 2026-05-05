import { useState } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import TextArea from '../components/TextArea'
import Alert from '../components/Alert'
import teamService from '../services/teamService'

interface JoinRequestModalProps {
  isOpen: boolean
  onClose: () => void
  teamName: string
  teamUuid: string
  onSuccess: () => void
}

const JoinRequestModal = ({ isOpen, onClose, teamName, teamUuid, onSuccess }: JoinRequestModalProps) => {
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await teamService.createJoinRequest(teamUuid, message.trim() || undefined)
      if (result.success) {
        onSuccess()
        handleClose()
      } else {
        setError(result.message || 'Failed to submit application')
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit application')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setMessage('')
    setError(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Apply to Join ${teamName}`} size="md" fullScreenMobile>
      <div className="space-y-4">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <p className="text-sm text-gray-600">
          Your application will be reviewed by a team lead. You'll be added once approved.
        </p>

        <TextArea
          label="Why do you want to join?"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Tell the team leads why you'd like to join (optional)…"
          rows={4}
        />
      </div>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} loading={isSubmitting}>
          Submit Application
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default JoinRequestModal
