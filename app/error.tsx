'use client'
import { useEffect } from 'react'
import { ErrorState } from '@/components/ui'
export default function Error({error,unstable_retry}:{error:Error&{digest?:string};unstable_retry:()=>void}){useEffect(()=>{console.error(error)},[error]);return <section className="route-page centered"><ErrorState title="This view could not be rendered" message="Your transaction activity remains available. Retry this route when ready." retry={unstable_retry}/></section>}
