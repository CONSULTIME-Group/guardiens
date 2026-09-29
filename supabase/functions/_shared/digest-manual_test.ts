import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { digestBypassesGuards } from './digest-manual.ts'
Deno.test('digest manuel sans identifiant : soumis à l\'anti-doublon', () => {
  assertEquals(digestBypassesGuards(true, undefined), false)
  assertEquals(digestBypassesGuards(true, '  '), false)
  assertEquals(digestBypassesGuards(false, 'abc'), false)
  assertEquals(digestBypassesGuards(true, 'abc'), true)
})
