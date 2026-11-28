begin;
insert into hardware.workloads (id,version,title,protocol) values
 ('repo-maintenance',1,'Repository maintenance','{"suite":"repo-maintenance-v1","task_count":30,"concurrency":[1,4],"success":"patch applies plus held-out tests, no prohibited files, within wall-time budget","replicates":3}'),
 ('evidence-research',1,'Evidence-grounded research','{"suite":"evidence-research-v1","task_count":30,"concurrency":[1,4],"success":"all required answers and citations match frozen corpus rubric within budget","replicates":3}'),
 ('local-inference',1,'Local inference throughput','{"suite":"local-inference-v1","task_count":30,"contexts":[4096,16384,32768],"concurrency":[1,4],"success":"valid response that meets exact match or schema criterion and time budget","replicates":3}');
commit;
