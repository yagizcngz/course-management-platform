import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authHeaders, readError } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";

import { API_BASE } from "@/components/courseHelpers";
export const Route = createFileRoute("/_authenticated/yardim-taleplerim")({
  component: MySupportRequestsPage,
});

interface SupportRequest {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  createdAt: string;
  isResolved: boolean;
  replyMessage: string | null;
  repliedAt: string | null;
}

function MySupportRequestsPage() {
  const { t, i18n } = useTranslation();
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    try {
      const token = localStorage.getItem("jwt_token");
      if (!token) return;

      const res = await fetch(`${API_BASE}/api/supportrequests/my-requests`, {
        headers: authHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      } else {
        toast.error(await readError(res, t("common.loadFailed")));
      }
    } catch (error) {
      console.error("Failed to fetch requests:", error);
      toast.error(t("common.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const sortedRequests = [...requests].sort((a, b) => {
    const dateA = a.isResolved ? a.repliedAt || a.createdAt : a.createdAt;
    const dateB = b.isResolved ? b.repliedAt || b.createdAt : b.createdAt;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  return (
    <>
      <PageHeader crumb={t("mySupportRequests.title", "Yardım Taleplerim")} />

      <div className="p-4 md:p-8 animate-reveal max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="text-center text-muted-foreground p-8">
            {t("mySupportRequests.loading", "Yükleniyor...")}
          </div>
        ) : (
          <Tabs defaultValue="pending" className="w-full">
            <div className="flex justify-between items-center mb-6">
              <TabsList className="grid w-full max-w-sm grid-cols-2">
                <TabsTrigger value="pending">{t("requests.pendingTab", "Bekleyenler")}</TabsTrigger>
                <TabsTrigger value="resolved">
                  {t("requests.resolvedTab", "Yanıtlanmış")}
                </TabsTrigger>
              </TabsList>
            </div>

            {[false, true].map((isResolved) => (
              <TabsContent key={isResolved.toString()} value={isResolved ? "resolved" : "pending"}>
                <div className="grid gap-6">
                  {sortedRequests.filter((r) => r.isResolved === isResolved).length === 0 ? (
                    <div className="text-center text-muted-foreground p-8 text-sm">
                      {t("requests.emptyTab", "Bu kategoride kayıt bulunmuyor.")}
                    </div>
                  ) : (
                    sortedRequests
                      .filter((r) => r.isResolved === isResolved)
                      .map((request) => (
                        <Card key={request.id} className="overflow-hidden">
                          <div className="bg-muted/50 p-4 border-b border-border flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-foreground">
                                {t("mySupportRequests.request", {
                                  id: request.id,
                                  defaultValue: `Talep #${request.id}`,
                                })}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {formatDateTime(request.createdAt, i18n.language)}
                              </div>
                            </div>
                            <div>
                              <Badge variant={request.isResolved ? "default" : "secondary"}>
                                {request.isResolved
                                  ? t("mySupportRequests.statusResolved", "Yanıtlandı")
                                  : t("mySupportRequests.statusPending", "İnceleniyor")}
                              </Badge>
                            </div>
                          </div>
                          <CardContent className="p-6">
                            <div className="mb-2 text-sm font-semibold text-muted-foreground">
                              {t("mySupportRequests.yourMessage", "Mesajınız:")}
                            </div>
                            <div className="text-foreground whitespace-pre-wrap mb-6">
                              {request.message}
                            </div>

                            {request.isResolved && request.replyMessage && (
                              <div className="p-5 bg-primary/5 rounded-xl border border-primary/20 relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                                <div className="text-xs font-bold text-primary mb-3 flex items-center justify-between">
                                  <span>
                                    {t("mySupportRequests.supportReply", "Destek Ekibi Yanıtı")}
                                  </span>
                                  <span>
                                    {request.repliedAt
                                      ? formatDateTime(request.repliedAt, i18n.language)
                                      : ""}
                                  </span>
                                </div>
                                <div className="text-sm text-foreground">
                                  {request.replyMessage}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </>
  );
}
