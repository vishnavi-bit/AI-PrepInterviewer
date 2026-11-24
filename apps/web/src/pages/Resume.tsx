// Resume: upload or replace a PDF/DOCX, read the extracted text, run the AI analysis, and correct it before it is used.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, FormControl, FormLabel, Grid, HStack, Input, Stack, Text, Textarea, Wrap, WrapItem, Tag, TagLabel, useDisclosure, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, Badge } from '@chakra-ui/react';
import { FileArrowUp, Trash, MagnifyingGlass, CheckCircle } from '@phosphor-icons/react';
import { api, ApiError } from '../api/client';
import type { AnalysisState, ResumeAnalysisData, ResumeInfo } from '../api/types';
import { EmptyState, ErrorAlert, Eyebrow, GhostButton, LoadingBlock, PageHeader, PrimaryButton, Surface } from '../components/ui';

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

const splitList = (raw: string) => raw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
const lines = (items: string[]) => items.join('\n');

export default function ResumePage() {
  const navigate = useNavigate();
  const [resume, setResume] = useState<ResumeInfo | null | undefined>(undefined);
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const [form, setForm] = useState<ResumeAnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const confirmDelete = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  const load = async () => {
    try {
      const r = await api.get<ResumeInfo>('/resume').catch((e) => (e instanceof ApiError && e.status === 404 ? null : Promise.reject(e)));
      setResume(r);
      if (r) {
        const a = await api.get<{ analysis: AnalysisState | null }>('/resume/analysis');
        setAnalysis(a.analysis);
        setForm(a.analysis?.analysis ?? null);
      } else {
        setAnalysis(null);
        setForm(null);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not load your resume.');
      setResume(null);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const upload = async (file: File | undefined) => {
    setError(null);
    setNotice(null);
    if (!file) return;
    if (!TYPES.includes(file.type) && !/\.(pdf|docx)$/i.test(file.name)) {
      setError('That file type is not supported. Upload a PDF or DOCX resume.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('That file is larger than 5 MB. Upload a smaller resume.');
      return;
    }
    setBusy('upload');
    try {
      const saved = await api.upload<ResumeInfo>('/resume', file);
      setResume(saved);
      setAnalysis(null);
      setForm(null);
      setNotice('Resume saved. Run the analysis to extract your skills and experience.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const analyse = async () => {
    setError(null);
    setNotice(null);
    setBusy('analyse');
    try {
      const res = await api.post<{ analysis: AnalysisState }>('/resume/analysis');
      setAnalysis(res.analysis);
      setForm(res.analysis.analysis);
      setNotice('Analysis ready. Check each field, correct anything that is wrong, then confirm.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The analysis did not complete. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const confirm = async () => {
    if (!form) return;
    setError(null);
    setBusy('confirm');
    try {
      const body = {
        skills: form.skills,
        technologies: form.technologies,
        education: form.education,
        projects: form.projects,
        experience: form.experience,
        certifications: form.certifications,
      };
      const res = await api.put<{ analysis: AnalysisState }>('/resume/analysis/corrections', body);
      setAnalysis(res.analysis);
      setNotice('Details confirmed. Your job role recommendations use these details.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Your changes were not saved. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    confirmDelete.onClose();
    setBusy('delete');
    try {
      await api.delete('/resume');
      setResume(null);
      setAnalysis(null);
      setForm(null);
      setNotice('Your resume and its extracted details were deleted.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const setList = (key: 'skills' | 'technologies' | 'education' | 'experience' | 'certifications', raw: string) =>
    setForm((f) => (f ? { ...f, [key]: key === 'education' || key === 'experience' || key === 'certifications' ? raw.split('\n').map((s) => s.trim()).filter(Boolean) : splitList(raw) } : f));

  return (
    <>
      <PageHeader title="Your resume" subtitle="Upload a PDF or Word file. We read it, you check it, then we use it to suggest roles and write questions." />
      <Stack spacing={6}>
        <ErrorAlert message={error} />
        {notice && <Text role="status" color="green.200" fontSize="sm">{notice}</Text>}

        {resume === undefined && <LoadingBlock />}

        {resume === null && (
          <Surface>
            <Stack spacing={5} align="center" textAlign="center" py={6}>
              <Box w="56px" h="56px" borderRadius="xl" bg="var(--pp-input)" border="1px solid" borderColor="var(--pp-border)" display="grid" placeItems="center" color="neon.cyan">
                <FileArrowUp size={26} aria-hidden />
              </Box>
              <Stack spacing={1}>
                <Text fontWeight="semibold" fontSize="lg">Upload your resume</Text>
                <Text color="var(--pp-muted)" fontSize="sm">PDF or DOCX, up to 5 MB. Scanned images cannot be read.</Text>
              </Stack>
              <FormControl maxW="sm">
                <FormLabel srOnly>Choose a resume file</FormLabel>
                <Input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" p={1.5} border="1px dashed" borderColor="var(--pp-border)" bg="var(--pp-input)" onChange={(e) => upload(e.target.files?.[0])} isDisabled={busy === 'upload'} />
              </FormControl>
              {busy === 'upload' && <Text fontSize="sm" color="var(--pp-muted)" role="status">Reading your resume…</Text>}
            </Stack>
          </Surface>
        )}

        {resume && (
          <>
            <Surface>
              <Stack direction={{ base: 'column', md: 'row' }} justify="space-between" spacing={4}>
                <Stack spacing={1}>
                  <Eyebrow>Uploaded file</Eyebrow>
                  <Text fontWeight="semibold" fontSize="lg">{resume.filename}</Text>
                  <Text fontSize="sm" color="var(--pp-faint)">{(resume.sizeBytes / 1024).toFixed(0)} KB · uploaded {new Date(resume.uploadedAt).toLocaleDateString()}</Text>
                </Stack>
                <HStack spacing={3} wrap="wrap">
                  <FormControl w="auto">
                    <FormLabel htmlFor="replace-resume" m={0} display="inline-flex" cursor="pointer" fontSize="sm" color="var(--pp-text)" px={4} py={2} borderRadius="lg" border="1px solid" borderColor="var(--pp-border)" _hover={{ bg: 'gray.900' }}>Replace file</FormLabel>
                    <Input id="replace-resume" type="file" accept=".pdf,.docx" display="none" onChange={(e) => upload(e.target.files?.[0])} />
                  </FormControl>
                  <GhostButton leftIcon={<Trash size={16} />} onClick={confirmDelete.onOpen} isLoading={busy === 'delete'} color="red.200" borderColor="rgba(255,90,90,0.3)">Delete</GhostButton>
                </HStack>
              </Stack>
              <Box as="details" mt={5}>
                <Box as="summary" cursor="pointer" color="neon.cyan" fontSize="sm" fontWeight="medium">Show extracted text</Box>
                <Text mt={3} fontSize="sm" color="var(--pp-muted)" whiteSpace="pre-wrap" maxH="260px" overflowY="auto" fontFamily="mono">{resume.extractedText}</Text>
              </Box>
            </Surface>

            {!form && (
              <Surface>
                <Stack spacing={4} align="flex-start">
                  <Text color="var(--pp-muted)">We have not analysed this resume yet. The analysis finds skills, education, projects, experience and certifications that appear in the text. It never adds anything that is not there.</Text>
                  <PrimaryButton leftIcon={<MagnifyingGlass size={18} />} onClick={analyse} isLoading={busy === 'analyse'} loadingText="Analysing">Analyse my resume</PrimaryButton>
                </Stack>
              </Surface>
            )}

            {form && (
              <Surface>
                <Stack spacing={6}>
                  <Stack direction={{ base: 'column', md: 'row' }} justify="space-between" spacing={3}>
                    <Stack spacing={1}>
                      <Eyebrow>Review</Eyebrow>
                      <Text fontWeight="semibold" fontSize="lg">Check what we found</Text>
                    </Stack>
                    {analysis?.confirmed ? (
                      <Badge colorScheme="green" alignSelf="flex-start" px={3} py={1} borderRadius="full"><HStack spacing={1}><CheckCircle size={14} /><span>Confirmed</span></HStack></Badge>
                    ) : (
                      <Badge colorScheme="yellow" alignSelf="flex-start" px={3} py={1} borderRadius="full">Not confirmed yet</Badge>
                    )}
                  </Stack>
                  <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={5}>
                    <FormControl>
                      <FormLabel color="var(--pp-muted)" fontSize="sm">Skills (comma separated)</FormLabel>
                      <Textarea rows={3} bg="var(--pp-input)" borderColor="var(--pp-border)" color="var(--pp-text)" value={form.skills.join(', ')} onChange={(e) => setList('skills', e.target.value)} />
                    </FormControl>
                    <FormControl>
                      <FormLabel color="var(--pp-muted)" fontSize="sm">Technologies (comma separated)</FormLabel>
                      <Textarea rows={3} bg="var(--pp-input)" borderColor="var(--pp-border)" color="var(--pp-text)" value={form.technologies.join(', ')} onChange={(e) => setList('technologies', e.target.value)} />
                    </FormControl>
                    <FormControl>
                      <FormLabel color="var(--pp-muted)" fontSize="sm">Education (one per line)</FormLabel>
                      <Textarea rows={3} bg="var(--pp-input)" borderColor="var(--pp-border)" color="var(--pp-text)" value={lines(form.education)} onChange={(e) => setList('education', e.target.value)} />
                    </FormControl>
                    <FormControl>
                      <FormLabel color="var(--pp-muted)" fontSize="sm">Certifications (one per line)</FormLabel>
                      <Textarea rows={3} bg="var(--pp-input)" borderColor="var(--pp-border)" color="var(--pp-text)" value={lines(form.certifications)} onChange={(e) => setList('certifications', e.target.value)} />
                    </FormControl>
                    <FormControl>
                      <FormLabel color="var(--pp-muted)" fontSize="sm">Experience and internships (one per line)</FormLabel>
                      <Textarea rows={4} bg="var(--pp-input)" borderColor="var(--pp-border)" color="var(--pp-text)" value={lines(form.experience)} onChange={(e) => setList('experience', e.target.value)} />
                    </FormControl>
                    <FormControl>
                      <FormLabel color="var(--pp-muted)" fontSize="sm">Projects (one per line, "Name: description")</FormLabel>
                      <Textarea rows={4} bg="var(--pp-input)" borderColor="var(--pp-border)" color="var(--pp-text)" value={form.projects.map((p) => `${p.name}: ${p.description}`).join('\n')} onChange={(e) => setForm((f) => (f ? { ...f, projects: e.target.value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [n, ...rest] = l.split(':'); return { name: (n ?? '').trim(), description: rest.join(':').trim() }; }) } : f))} />
                    </FormControl>
                  </Grid>
                  {form.skills.length + form.technologies.length > 0 && (
                    <Wrap spacing={2}>
                      {[...form.skills, ...form.technologies].slice(0, 20).map((s) => (
                        <WrapItem key={s}><Tag size="md" borderRadius="full" bg="var(--pp-input)" border="1px solid" borderColor="var(--pp-border)" color="var(--pp-text)"><TagLabel>{s}</TagLabel></Tag></WrapItem>
                      ))}
                    </Wrap>
                  )}
                  <HStack spacing={3} wrap="wrap">
                    <PrimaryButton onClick={confirm} isLoading={busy === 'confirm'} loadingText="Saving">Confirm these details</PrimaryButton>
                    <GhostButton onClick={() => navigate('/roles')} isDisabled={!analysis?.confirmed}>See job roles</GhostButton>
                  </HStack>
                </Stack>
              </Surface>
            )}
          </>
        )}

        {resume === null && !busy && (
          <EmptyState title="No resume yet" body="Upload a resume to start. Your resume is only visible to you." />
        )}
      </Stack>

      <AlertDialog isOpen={confirmDelete.isOpen} leastDestructiveRef={cancelRef} onClose={confirmDelete.onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent bg="var(--pp-input)" border="1px solid" borderColor="var(--pp-border)">
            <AlertDialogHeader fontWeight="semibold">Delete your resume?</AlertDialogHeader>
            <AlertDialogBody color="var(--pp-muted)">The file, its extracted text and the analysis are removed. Past interview reports are kept.</AlertDialogBody>
            <AlertDialogFooter>
              <GhostButton ref={cancelRef} onClick={confirmDelete.onClose}>Cancel</GhostButton>
              <PrimaryButton ml={3} bg="red.500" _hover={{ bg: 'red.400' }} onClick={remove}>Delete resume</PrimaryButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}
