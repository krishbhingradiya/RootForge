import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { showToast } from '../../components/common/Toast';
import './databaseDesigner.css';

// View Model & Compilers
import {
  normalizeDatabaseModel,
  generateSqlDdl,
  generatePrismaSchema,
  runSchemaValidation
} from './databaseViewModel';

// Studio Views
import { DatabasePageHeader } from './components/DatabasePageHeader';
import { ErdVisualizerView } from './components/ErdVisualizerView';
import { SqlDdlView } from './components/SqlDdlView';
import { PrismaSchemaView } from './components/PrismaSchemaView';
import { RestApiView } from './components/RestApiView';
import { IntegrationArchitectureView } from './components/IntegrationArchitectureView';
import { DataFlowDiagramView } from './components/DataFlowDiagramView';
import { ValidationReportView } from './components/ValidationReportView';
import { DatabaseAiAssistantPanel } from './components/DatabaseAiAssistantPanel';

// Modals
import { VersionHistoryModal } from './components/VersionHistoryModal';
import { DatabaseExportModal } from './components/DatabaseExportModal';
import { DatabaseCollaborationModal } from './components/DatabaseCollaborationModal';
import { EntityEditModal } from './components/EntityEditModal';
import { FieldEditModal } from './components/FieldEditModal';
import { RelationshipEditModal } from './components/RelationshipEditModal';
import { ApiEditModal } from './components/ApiEditModal';

// Icons
import {
  Table,
  Code2,
  FileCode2,
  Webhook,
  Network,
  Activity,
  ShieldCheck,
  Database,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

export const DatabaseDesignerPage = () => {
  const { id } = useParams();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Core Studio State (Single Source of Truth)
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('erd'); // 'erd' | 'sql' | 'prisma' | 'apis' | 'integration' | 'dataflow' | 'validation'
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Modals & Panels
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCollabModal, setShowCollabModal] = useState(false);

  // CRUD Modals
  const [entityModalConfig, setEntityModalConfig] = useState({ open: false, initial: null });
  const [fieldModalConfig, setFieldModalConfig] = useState({ open: false, entityName: null, field: null, index: null });
  const [relationModalConfig, setRelationModalConfig] = useState({ open: false, initial: null, index: null });
  const [apiModalConfig, setApiModalConfig] = useState({ open: false, initial: null, index: null });

  // Load Database & API Models
  const loadData = async () => {
    try {
      setLoading(true);
      const [dbRes, apiRes, wsRes] = await Promise.all([
        api.getDatabase(id).catch(() => ({})),
        api.getAPI(id).catch(() => ({})),
        api.getWorkspace ? api.getWorkspace(id).catch(() => ({})) : Promise.resolve({})
      ]);

      const normalized = normalizeDatabaseModel({
        dbDesign: dbRes?.database || null,
        apiDesign: apiRes?.apiDesign || null,
        workspace: wsRes?.workspace || null,
        domain: wsRes?.workspace?.industry || 'Enterprise'
      });

      setModel(normalized);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Failed to load database design:', err);
      showToast('Error loading database design', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Single-Source-of-Truth Updater: Recompiles DDL, Prisma, and Validation reactively
  const mutateModel = (mutationFn) => {
    setModel((prev) => {
      if (!prev) return prev;
      const draft = JSON.parse(JSON.stringify(prev));
      mutationFn(draft);

      // Reactive compilation across all dependent representations
      draft.sqlSchema = generateSqlDdl(draft.entities, draft.relations, 'postgres');
      draft.prismaSchema = generatePrismaSchema(draft.entities, draft.relations);
      draft.validation = runSchemaValidation(draft.entities, draft.relations, draft.endpoints, draft.integrations);

      return draft;
    });
    setHasUnsavedChanges(true);
  };

  // Persist Current Model State
  const handleSaveCurrentState = async () => {
    if (!model) return;
    try {
      await Promise.all([
        api.updateDatabase(id, {
          title: model.title,
          entities: JSON.stringify(model.entities),
          relations: JSON.stringify(model.relations),
          sqlSchema: model.sqlSchema,
          prismaSchema: model.prismaSchema,
          status: model.status
        }),
        api.updateAPI(id, {
          endpoints: JSON.stringify(model.endpoints)
        })
      ]);

      // Create artifact version snapshot
      const nextVer = (model.version || 1) + 1;
      await api.saveVersion(id, {
        artifactType: 'DATABASE',
        versionNumber: nextVer,
        snapshotData: JSON.stringify(model),
        notes: `Saved snapshot v${nextVer}`
      });

      setModel(prev => ({ ...prev, version: nextVer }));
      setHasUnsavedChanges(false);
      showToast(`Saved version v${nextVer} successfully!`);
    } catch (err) {
      showToast(err.message || 'Failed to save version', 'error');
    }
  };

  // Regenerate Handlers
  const handleRegenerateComponent = async (componentKey) => {
    try {
      setGenerating(true);
      if (componentKey === 'everything') {
        const [dbRes, apiRes] = await Promise.all([
          api.generateDatabase(id),
          api.generateAPI(id)
        ]);
        const normalized = normalizeDatabaseModel({
          dbDesign: dbRes?.database,
          apiDesign: apiRes?.apiDesign,
          domain: model?.domain
        });
        setModel(normalized);
        setHasUnsavedChanges(false);
        showToast('Complete Database & API solution synthesized!');
      } else if (componentKey === 'erd' || componentKey === 'tables') {
        const res = await api.regenerateDatabaseComponent(id, componentKey);
        if (res?.entities) {
          mutateModel((draft) => {
            draft.entities = res.entities;
            if (res.relations) draft.relations = res.relations;
          });
        }
        showToast('Regenerated ERD entities & tables.');
      } else if (componentKey === 'sql') {
        mutateModel((draft) => {
          draft.sqlSchema = generateSqlDdl(draft.entities, draft.relations, 'postgres');
        });
        showToast('Regenerated SQL DDL from current ERD schema.');
      } else if (componentKey === 'prisma') {
        mutateModel((draft) => {
          draft.prismaSchema = generatePrismaSchema(draft.entities, draft.relations);
        });
        showToast('Regenerated Prisma Schema from current ERD schema.');
      } else if (componentKey === 'apis') {
        const res = await api.regenerateDatabaseComponent(id, 'apis');
        if (res?.endpoints) {
          mutateModel((draft) => {
            draft.endpoints = res.endpoints;
          });
        }
        showToast('Regenerated REST APIs from current entity capabilities.');
      } else if (componentKey === 'validation') {
        mutateModel((draft) => {
          draft.validation = runSchemaValidation(draft.entities, draft.relations, draft.endpoints, draft.integrations);
        });
        showToast('Recalculated full schema validation audit.');
      } else {
        await api.regenerateDatabaseComponent(id, componentKey);
        showToast(`Regenerated ${componentKey.toUpperCase()} component.`);
      }
    } catch (err) {
      showToast(err.message || 'Generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleRestoreSnapshot = (snapshotVersion) => {
    try {
      let data = snapshotVersion.snapshotData;
      if (typeof data === 'string') data = JSON.parse(data);
      if (data) {
        const normalized = normalizeDatabaseModel({
          dbDesign: data,
          apiDesign: { endpoints: data.endpoints },
          domain: data.domain || model?.domain
        });
        setModel(normalized);
        setHasUnsavedChanges(true);
        showToast(`Restored snapshot v${snapshotVersion.versionNumber}`);
      }
    } catch (err) {
      console.error('Failed to restore snapshot:', err);
      showToast('Failed to parse snapshot data', 'error');
    }
  };

  // ==========================================
  // Entity CRUD Handlers
  // ==========================================
  const handleAddEntity = () => {
    setEntityModalConfig({ open: true, initial: null });
  };

  const handleEditEntity = (entity) => {
    setEntityModalConfig({ open: true, initial: entity });
  };

  const handleSaveEntityModal = (entityData) => {
    mutateModel((draft) => {
      const existingIdx = draft.entities.findIndex(e => e.name.toLowerCase() === entityData.name.toLowerCase());
      if (existingIdx >= 0) {
        draft.entities[existingIdx].description = entityData.description;
      } else {
        draft.entities.push({
          name: entityData.name,
          description: entityData.description,
          fields: [
            {
              name: 'id',
              type: 'VARCHAR(36)',
              constraints: 'PRIMARY KEY',
              description: 'Primary unique UUID',
              isPrimaryKey: true,
              isUnique: true,
              isNullable: false,
              defaultValue: 'uuid_generate_v4()'
            },
            {
              name: 'createdAt',
              type: 'TIMESTAMP',
              constraints: 'DEFAULT CURRENT_TIMESTAMP, NOT NULL',
              description: 'Creation timestamp',
              isPrimaryKey: false,
              isUnique: false,
              isNullable: false,
              defaultValue: 'CURRENT_TIMESTAMP'
            }
          ]
        });
      }
    });
    showToast(`Entity "${entityData.name}" updated`);
  };

  const handleDeleteEntity = (entityName) => {
    if (!window.confirm(`Delete entity table "${entityName}"? Associated relations will also be removed.`)) return;

    mutateModel((draft) => {
      draft.entities = draft.entities.filter(e => e.name !== entityName);
      draft.relations = draft.relations.filter(r => !r.from.startsWith(entityName) && !r.to.startsWith(entityName));
    });
    showToast(`Deleted entity "${entityName}"`);
  };

  // ==========================================
  // Field CRUD Handlers
  // ==========================================
  const handleAddField = (entityName) => {
    setFieldModalConfig({ open: true, entityName, field: null, index: null });
  };

  const handleEditField = (entityName, fieldIndex, field) => {
    setFieldModalConfig({ open: true, entityName, field, index: fieldIndex });
  };

  const handleSaveFieldModal = (entityName, fieldIndex, fieldData) => {
    mutateModel((draft) => {
      const targetEntity = draft.entities.find(e => e.name === entityName);
      if (!targetEntity) return;

      if (fieldIndex !== null && fieldIndex !== undefined) {
        targetEntity.fields[fieldIndex] = fieldData;
      } else {
        targetEntity.fields.push(fieldData);
      }
    });
    showToast(`Saved field "${fieldData.name}" in ${entityName}`);
  };

  const handleDeleteField = (entityName, fieldIndex) => {
    mutateModel((draft) => {
      const targetEntity = draft.entities.find(e => e.name === entityName);
      if (targetEntity) {
        const deletedField = targetEntity.fields[fieldIndex];
        targetEntity.fields.splice(fieldIndex, 1);
        if (deletedField) {
          draft.relations = draft.relations.filter(r => r.from !== `${entityName}.${deletedField.name}`);
        }
      }
    });
    showToast('Deleted field');
  };

  // ==========================================
  // Relationship CRUD Handlers
  // ==========================================
  const handleAddRelation = () => {
    setRelationModalConfig({ open: true, initial: null, index: null });
  };

  const handleEditRelation = (index, rel) => {
    setRelationModalConfig({ open: true, initial: rel, index });
  };

  const handleSaveRelationModal = (relationIndex, relData) => {
    mutateModel((draft) => {
      if (relationIndex !== null && relationIndex !== undefined) {
        draft.relations[relationIndex] = relData;
      } else {
        draft.relations.push(relData);
      }
    });
    showToast(`Relationship declared: ${relData.from} → ${relData.to}`);
  };

  const handleDeleteRelation = (relationIndex) => {
    mutateModel((draft) => {
      draft.relations.splice(relationIndex, 1);
    });
    showToast('Deleted relationship');
  };

  // ==========================================
  // REST API CRUD Handlers
  // ==========================================
  const handleAddEndpoint = () => {
    setApiModalConfig({ open: true, initial: null, index: null });
  };

  const handleEditEndpoint = (index, ep) => {
    setApiModalConfig({ open: true, initial: ep, index });
  };

  const handleDuplicateEndpoint = (index, ep) => {
    mutateModel((draft) => {
      const clone = JSON.parse(JSON.stringify(ep));
      clone.endpoint = `${clone.endpoint}-copy`;
      clone.purpose = `[Copy] ${clone.purpose}`;
      draft.endpoints.splice(index + 1, 0, clone);
    });
    showToast('Endpoint duplicated');
  };

  const handleDeleteEndpoint = (index) => {
    mutateModel((draft) => {
      draft.endpoints.splice(index, 1);
    });
    showToast('Deleted endpoint');
  };

  const handleSaveApiModal = (endpointIndex, epData) => {
    mutateModel((draft) => {
      if (endpointIndex !== null && endpointIndex !== undefined) {
        draft.endpoints[endpointIndex] = epData;
      } else {
        draft.endpoints.push(epData);
      }
    });
    showToast(`Endpoint saved: ${epData.method} ${epData.endpoint}`);
  };

  // ==========================================
  // Validation "Apply Fix" Automated Handlers
  // ==========================================
  const handleApplyValidationFix = (issue) => {
    mutateModel((draft) => {
      switch (issue.fixType) {
        case 'ADD_PK': {
          const ent = draft.entities.find(e => e.name === issue.targetEntity);
          if (ent) {
            ent.fields.unshift({
              name: 'id',
              type: 'VARCHAR(36)',
              constraints: 'PRIMARY KEY',
              description: 'Primary unique UUID',
              isPrimaryKey: true,
              isUnique: true,
              isNullable: false,
              defaultValue: 'uuid_generate_v4()'
            });
          }
          break;
        }
        case 'REMOVE_DUPLICATE_FIELD': {
          const ent = draft.entities.find(e => e.name === issue.targetEntity);
          if (ent) {
            let count = 0;
            ent.fields = ent.fields.filter(f => {
              if (f.name.toLowerCase() === issue.fieldName.toLowerCase()) {
                count++;
                return count === 1;
              }
              return true;
            });
          }
          break;
        }
        case 'ADD_RELATION': {
          if (issue.relation) {
            draft.relations.push(issue.relation);
          }
          break;
        }
        case 'REMOVE_RELATION': {
          if (issue.relationIndex !== undefined) {
            draft.relations.splice(issue.relationIndex, 1);
          }
          break;
        }
        case 'GENERATE_API_FOR_ENTITY': {
          const lower = issue.entityName.toLowerCase();
          draft.endpoints.push({
            method: 'GET',
            endpoint: `/api/v1/${lower}s`,
            purpose: `List and filter ${issue.entityName} records.`,
            description: `Queries active ${issue.entityName} entities with pagination.`,
            authentication: 'Bearer JWT',
            primaryEntity: issue.entityName,
            parameters: '?page=1&limit=25',
            responseBody: '{\n  "data": [],\n  "total": 0\n}'
          });
          break;
        }
        case 'ADD_AUDIT_FIELD': {
          const ent = draft.entities.find(e => e.name === issue.targetEntity);
          if (ent) {
            ent.fields.push({
              name: 'createdAt',
              type: 'TIMESTAMP',
              constraints: 'DEFAULT CURRENT_TIMESTAMP, NOT NULL',
              description: 'Audit record creation timestamp',
              isPrimaryKey: false,
              isNullable: false,
              defaultValue: 'CURRENT_TIMESTAMP'
            });
          }
          break;
        }
        default:
          break;
      }
    });

    showToast(`Fix applied: ${issue.recommendedFix}`);
  };

  // Assistant Quick Action Handler
  const handleApplyAssistantSuggestion = (suggestionText) => {
    if (suggestionText.includes('audit fields')) {
      mutateModel((draft) => {
        draft.entities.forEach(ent => {
          if (!ent.fields.some(f => f.name === 'createdAt')) {
            ent.fields.push({
              name: 'createdAt',
              type: 'TIMESTAMP',
              constraints: 'DEFAULT CURRENT_TIMESTAMP, NOT NULL',
              description: 'Creation timestamp',
              isNullable: false,
              defaultValue: 'CURRENT_TIMESTAMP'
            });
          }
        });
      });
      showToast('Standard audit fields applied across all entities.');
    } else {
      showToast(`Suggestion acknowledged: "${suggestionText}"`);
    }
  };

  if (!model) {
    return null;
  }

  // 7 Required Tabs Definition
  const tabs = [
    { key: 'erd', label: `ERD (${model.entities.length})`, icon: Table },
    { key: 'sql', label: 'SQL DDL', icon: Code2 },
    { key: 'prisma', label: 'Prisma Schema', icon: FileCode2 },
    { key: 'apis', label: `REST API (${model.endpoints.length})`, icon: Webhook },
    { key: 'integration', label: `Integration Architecture (${model.integrations.length})`, icon: Network },
    { key: 'dataflow', label: `Data Flow (${model.dataFlows.length})`, icon: Activity },
    {
      key: 'validation',
      label: `Validation (${model.validation?.totalIssues || 0})`,
      icon: ShieldCheck,
      badge: model.validation?.score ? `${model.validation.score}%` : null,
      badgeColor: model.validation?.score >= 80 ? '#10B981' : '#F59E0B'
    }
  ];

  return (
    <div className="db-studio-container">
      {/* Studio Header Bar */}
      <DatabasePageHeader
        model={model}
        t={t}
        id={id}
        navigate={navigate}
        onSaveVersion={handleSaveCurrentState}
        onOpenVersionModal={() => setShowVersionModal(true)}
        onOpenExportModal={() => setShowExportModal(true)}
        onOpenCollabModal={() => setShowCollabModal(true)}
        onToggleAi={() => setShowAiDrawer(!showAiDrawer)}
        onRegenerateComponent={handleRegenerateComponent}
        generating={generating}
        hasUnsavedChanges={hasUnsavedChanges}
      />

      {/* Output Navigation: 7 Dedicated Studio Tabs */}
      <div className="db-tabs-bar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`db-tab-btn ${isActive ? 'active' : ''}`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: 10,
                    backgroundColor: tab.badgeColor ? `${tab.badgeColor}25` : 'rgba(255,255,255,0.1)',
                    color: tab.badgeColor || '#FFFFFF',
                    border: `1px solid ${tab.badgeColor || 'rgba(255,255,255,0.2)'}`
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Interactive ERD View */}
      {activeTab === 'erd' && (
        <ErdVisualizerView
          entities={model.entities}
          relations={model.relations}
          onAddEntity={handleAddEntity}
          onEditEntity={handleEditEntity}
          onDeleteEntity={handleDeleteEntity}
          onAddField={handleAddField}
          onEditField={handleEditField}
          onDeleteField={handleDeleteField}
          onAddRelation={handleAddRelation}
          onEditRelation={handleEditRelation}
          onDeleteRelation={handleDeleteRelation}
        />
      )}

      {/* Tab 2: SQL DDL View (PostgreSQL / SQLite) */}
      {activeTab === 'sql' && (
        <SqlDdlView
          entities={model.entities}
          relations={model.relations}
          onRegenerate={handleRegenerateComponent}
          onExportFile={(content, filename) => {
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
          }}
          onEditDdl={(customSql) => {
            mutateModel((draft) => {
              draft.sqlSchema = customSql;
            });
            showToast('Custom SQL DDL updated');
          }}
        />
      )}

      {/* Tab 3: Prisma Schema View */}
      {activeTab === 'prisma' && (
        <PrismaSchemaView
          entities={model.entities}
          relations={model.relations}
          onRegenerate={handleRegenerateComponent}
          onExportFile={(content, filename) => {
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
          }}
          onEditPrisma={(customPrisma) => {
            mutateModel((draft) => {
              draft.prismaSchema = customPrisma;
            });
            showToast('Custom Prisma schema updated');
          }}
        />
      )}

      {/* Tab 4: REST API View */}
      {activeTab === 'apis' && (
        <RestApiView
          endpoints={model.endpoints}
          entities={model.entities}
          relations={model.relations}
          onAddEndpoint={handleAddEndpoint}
          onEditEndpoint={handleEditEndpoint}
          onDuplicateEndpoint={handleDuplicateEndpoint}
          onDeleteEndpoint={handleDeleteEndpoint}
          onRegenerate={handleRegenerateComponent}
        />
      )}

      {/* Tab 5: Integration Architecture View */}
      {activeTab === 'integration' && (
        <IntegrationArchitectureView
          integrations={model.integrations}
          onAddIntegration={() => {
            const newName = prompt('Enter new component name (e.g. Audit Event Hub):');
            if (!newName) return;
            mutateModel((draft) => {
              draft.integrations.push({
                id: `node-${Date.now()}`,
                name: newName,
                layer: 'Service',
                responsibility: 'Custom operational integration service',
                technology: 'Node.js / Kafka',
                interfaces: ['HTTPS / gRPC'],
                connectedApis: [],
                connectedEntities: []
              });
            });
          }}
          onEditIntegration={(node) => {
            const updatedResp = prompt(`Edit responsibility for ${node.name}:`, node.responsibility);
            if (updatedResp === null) return;
            mutateModel((draft) => {
              const target = draft.integrations.find(n => n.id === node.id);
              if (target) target.responsibility = updatedResp;
            });
          }}
          onDeleteIntegration={(nodeId) => {
            mutateModel((draft) => {
              draft.integrations = draft.integrations.filter(n => n.id !== nodeId);
            });
            showToast('Component removed from integration topology');
          }}
        />
      )}

      {/* Tab 6: Data Flow View */}
      {activeTab === 'dataflow' && (
        <DataFlowDiagramView
          dataFlows={model.dataFlows}
          onEditStep={(idx, step) => {
            const updatedDesc = prompt(`Edit step description for "${step.name}":`, step.description);
            if (updatedDesc === null) return;
            mutateModel((draft) => {
              draft.dataFlows[idx].description = updatedDesc;
            });
          }}
          onAddStep={() => {
            const stepName = prompt('Enter new data flow step name:');
            if (!stepName) return;
            mutateModel((draft) => {
              draft.dataFlows.push({
                step: draft.dataFlows.length + 1,
                name: stepName,
                actor: 'System Service',
                from: 'Service Node',
                to: 'Database Target',
                protocol: 'HTTPS / JSON',
                payload: 'Step payload description',
                direction: 'Service → Database',
                description: 'Custom transaction execution stage.'
              });
            });
          }}
          onRegenerate={handleRegenerateComponent}
        />
      )}

      {/* Tab 7: Validation View */}
      {activeTab === 'validation' && (
        <ValidationReportView
          validation={model.validation}
          onApplyFix={handleApplyValidationFix}
          onRevalidate={() => {
            mutateModel(() => {});
            showToast('Re-evaluated all 14 validation rules.');
          }}
        />
      )}

      {/* Contextual AI Assistant Drawer Panel */}
      <DatabaseAiAssistantPanel
        isOpen={showAiDrawer}
        onClose={() => setShowAiDrawer(false)}
        workspaceId={id}
        model={model}
        onApplyAssistantSuggestion={handleApplyAssistantSuggestion}
      />

      {/* Modals */}
      <VersionHistoryModal
        isOpen={showVersionModal}
        onClose={() => setShowVersionModal(false)}
        workspaceId={id}
        currentModel={model}
        onRestoreSnapshot={handleRestoreSnapshot}
      />

      <DatabaseExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        model={model}
      />

      <DatabaseCollaborationModal
        isOpen={showCollabModal}
        onClose={() => setShowCollabModal(false)}
        workspaceId={id}
        model={model}
        onStatusChange={(newStat) => setModel(prev => ({ ...prev, status: newStat }))}
      />

      {/* CRUD Modals */}
      <EntityEditModal
        isOpen={entityModalConfig.open}
        onClose={() => setEntityModalConfig({ open: false, initial: null })}
        initialEntity={entityModalConfig.initial}
        onSave={handleSaveEntityModal}
      />

      <FieldEditModal
        isOpen={fieldModalConfig.open}
        onClose={() => setFieldModalConfig({ open: false, entityName: null, field: null, index: null })}
        entityName={fieldModalConfig.entityName}
        initialField={fieldModalConfig.field}
        fieldIndex={fieldModalConfig.index}
        onSave={handleSaveFieldModal}
      />

      <RelationshipEditModal
        isOpen={relationModalConfig.open}
        onClose={() => setRelationModalConfig({ open: false, initial: null, index: null })}
        entities={model.entities}
        initialRelation={relationModalConfig.initial}
        relationIndex={relationModalConfig.index}
        onSave={handleSaveRelationModal}
      />

      <ApiEditModal
        isOpen={apiModalConfig.open}
        onClose={() => setApiModalConfig({ open: false, initial: null, index: null })}
        entities={model.entities}
        endpoints={model.apis}
        initialEndpoint={apiModalConfig.initial}
        endpointIndex={apiModalConfig.index}
        onSave={handleSaveApiModal}
      />

    </div>
  );
};
