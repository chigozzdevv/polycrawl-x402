import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import type { CatalogResource } from '@/services/api';
import { Search, FileText, Filter, CheckCircle, Eye, EyeOff } from 'lucide-react';

export function ResourcesPage() {
  const [resources, setResources] = useState<CatalogResource[]>([]);
  const [filteredResources, setFilteredResources] = useState<CatalogResource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedResourceId, setExpandedResourceId] = useState<string | null>(null);

  useEffect(() => {
    loadResources();
  }, []);

  useEffect(() => {
    filterResources();
  }, [searchQuery, filterType, resources]);

  const loadResources = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCatalogResources();
      setResources(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load resources');
    } finally {
      setIsLoading(false);
    }
  };

  const filterResources = () => {
    let filtered = resources;

    if (searchQuery) {
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter((r) => r.type === filterType);
    }

    setFilteredResources(filtered);
  };

  if (isLoading) {
    return <div className="text-fog">Loading resources...</div>;
  }

  if (error) {
    return <div className="text-ember">{error}</div>;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const resourceTypes = ['all', ...new Set(resources.map((r) => r.type))];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-fog text-sm">Total Resources</span>
                <FileText className="w-5 h-5 text-sand" />
              </div>
              <div className="text-2xl font-semibold text-parchment">
                {resources.length}
              </div>
              <div className="text-xs text-fog mt-1">Available to access</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-fog text-sm">Verified</span>
                <CheckCircle className="w-5 h-5 text-sand" />
              </div>
              <div className="text-2xl font-semibold text-parchment">
                {resources.filter((r) => r.verified).length}
              </div>
              <div className="text-xs text-fog mt-1">Trusted sources</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-fog text-sm">Filtered</span>
                <Filter className="w-5 h-5 text-fog" />
              </div>
              <div className="text-2xl font-semibold text-parchment">
                {filteredResources.length}
              </div>
              <div className="text-xs text-fog mt-1">Matching criteria</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fog" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search resources..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-parchment placeholder-fog/50 focus:outline-none focus:border-sand/50"
                />
              </div>
              <div className="flex gap-2">
                {resourceTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                      filterType === type
                        ? 'bg-sand text-ink'
                        : 'bg-white/5 text-fog hover:text-parchment'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {filteredResources.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-fog mx-auto mb-4" />
                <p className="text-fog mb-2">No resources found</p>
                <p className="text-sm text-fog/70">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredResources.map((resource) => (
                  <div
                    key={resource._id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-parchment font-medium">{resource.title}</h3>
                        {resource.verified && (
                          <CheckCircle className="w-4 h-4 text-sand" />
                        )}
                      </div>
                        {(resource.summary || resource.sample_preview) && (
                          <div className="text-sm text-fog">
                            <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-widest text-white/40">
                              <span>Preview</span>
                              <button
                                className="flex items-center gap-1 text-[11px] text-sand"
                                onClick={() =>
                                  setExpandedResourceId(
                                    expandedResourceId === resource._id ? null : resource._id
                                  )
                                }
                              >
                                {expandedResourceId === resource._id ? (
                                  <>
                                    <EyeOff className="h-3 w-3" /> Hide
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-3 w-3" /> View
                                  </>
                                )}
                              </button>
                            </div>
                            <p
                              className={`rounded-lg bg-black/20 p-3 text-xs text-fog ${
                                expandedResourceId === resource._id ? '' : 'line-clamp-3'
                              }`}
                            >
                              {resource.sample_preview || resource.summary}
                            </p>
                          </div>
                        )}
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs px-2 py-1 rounded bg-sand/10 text-sand">
                          {resource.type}
                        </span>
                        <span className="text-xs px-2 py-1 rounded bg-white/5 text-fog">
                          {resource.format}
                        </span>
                        {resource.size_bytes && (
                          <span className="text-xs text-fog">
                            {(resource.size_bytes / 1024).toFixed(2)} KB
                          </span>
                        )}
                        {resource.tags && resource.tags.length > 0 && (
                          <div className="flex gap-1">
                            {resource.tags.slice(0, 3).map((tag, i) => (
                              <span key={i} className="text-xs px-2 py-1 rounded bg-ember/10 text-ember">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        {resource.price_flat && (
                          <div className="text-parchment font-medium">
                            {formatCurrency(resource.price_flat)}
                          </div>
                        )}
                        {resource.price_per_kb && (
                          <div className="text-sand text-sm">
                            {formatCurrency(resource.price_per_kb)}/KB
                          </div>
                        )}
                      </div>
                      <Button variant="primary">Access</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
