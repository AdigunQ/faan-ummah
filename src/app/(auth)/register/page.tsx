'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'react-hot-toast'
import { Loader2, UserPlus } from 'lucide-react'

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Full name is required'),
  staffId: z.string().trim().min(1, 'Staff ID is required').regex(/^[a-zA-Z0-9-]+$/, 'Staff ID must be alphanumeric'),
  email: z.string().trim().min(1, 'Email is required').email('Invalid email address'),
  phone: z.string().trim().min(1, 'Phone number is required').min(10, 'Phone number must be at least 10 digits'),
  department: z.string().trim().min(1, 'Department is required'),
  bankName: z.string().trim().min(1, 'Bank name is required'),
  bankAccountNumber: z.string().trim().min(10, 'Bank account number must be at least 10 digits').max(20),
  bankAccountName: z.string().trim().min(2, 'Bank account name is required'),
  monthlyContribution: z.number({ invalid_type_error: 'Monthly savings amount is required' }).gt(0, 'Monthly savings amount must be greater than zero'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      monthlyContribution: 10000,
    },
  })

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          staffId: data.staffId,
          email: data.email,
          phone: data.phone,
          department: data.department,
          bankName: data.bankName,
          bankAccountNumber: data.bankAccountNumber,
          bankAccountName: data.bankAccountName,
          monthlyContribution: data.monthlyContribution,
          password: data.password,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed')
      }

      toast.success('Registration successful! Please wait for admin approval.')
      router.push('/login')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-600 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 animate-fadeIn">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-50 rounded-full mb-4">
            <UserPlus className="w-10 h-10 text-primary-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Member Registration</h1>
          <p className="text-gray-500 mt-2">Join our cooperative society</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              {...register('name')}
              type="text"
              placeholder="Enter your full name"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="Enter your email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Staff ID
            </label>
            <input
              {...register('staffId')}
              type="text"
              placeholder="e.g. OPS-1042"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
            />
            {errors.staffId && (
              <p className="mt-1 text-sm text-red-600">{errors.staffId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                {...register('phone')}
                type="tel"
                placeholder="Phone"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <input
                {...register('department')}
                type="text"
                placeholder="Department"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              />
              {errors.department && (
                <p className="mt-1 text-sm text-red-600">{errors.department.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bank Name
            </label>
            <input
              {...register('bankName')}
              type="text"
              placeholder="e.g. Access Bank"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
            />
            {errors.bankName && (
              <p className="mt-1 text-sm text-red-600">{errors.bankName.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Account Number
              </label>
              <input
                {...register('bankAccountNumber')}
                type="text"
                placeholder="10-digit account number"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              />
              {errors.bankAccountNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.bankAccountNumber.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Account Name
              </label>
              <input
                {...register('bankAccountName')}
                type="text"
                placeholder="Name on account"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              />
              {errors.bankAccountName && (
                <p className="mt-1 text-sm text-red-600">{errors.bankAccountName.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Savings Amount (₦)
            </label>
            <input
              {...register('monthlyContribution', { valueAsNumber: true })}
              type="number"
              min="1"
              placeholder="e.g. 10000"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
            />
            {errors.monthlyContribution && (
              <p className="mt-1 text-sm text-red-600">{errors.monthlyContribution.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              This amount authorizes monthly salary deduction into your cooperative savings.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              {...register('password')}
              type="password"
              placeholder="Create password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              {...register('confirmPassword')}
              type="password"
              placeholder="Confirm password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-500 text-white py-3 rounded-lg font-semibold hover:bg-primary-600 focus:ring-4 focus:ring-primary-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Application'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-primary-500 font-semibold hover:underline">
              Login here
            </Link>
          </p>
          <p className="text-sm text-gray-400 mt-4 flex items-center justify-center gap-1">
            <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
            Your account will be pending admin approval
          </p>
        </div>
      </div>
    </div>
  )
}
