// Copyright (c) 2024 GitHub, Inc.
// Use of this source code is governed by the MIT license that can be
// found in the LICENSE file.

#ifndef ELECTRON_SHELL_BROWSER_API_ELECTRON_API_CAST_H_
#define ELECTRON_SHELL_BROWSER_API_ELECTRON_API_CAST_H_

#include <memory>
#include <string>
#include <vector>

#include "base/memory/weak_ptr.h"
#include "gin/wrappable.h"
#include "shell/browser/event_emitter_mixin.h"
#include "shell/common/gin_helper/constructible.h"

namespace gin {
class Arguments;
}

namespace gin_helper {
class Dictionary;
}

namespace electron::api {

class Cast : public gin::Wrappable<Cast>,
             public gin_helper::Constructible<Cast>,
             public EventEmitterMixin<Cast> {
 public:
  static gin::Handle<Cast> Create(v8::Isolate* isolate);

  // gin::Wrappable
  static gin::WrapperInfo kWrapperInfo;
  gin::ObjectTemplateBuilder GetObjectTemplateBuilder(
      v8::Isolate* isolate) override;
  const char* GetTypeName() override;

  // Methods
  void StartDiscovery(gin::Arguments* args);
  void StopDiscovery();
  std::vector<base::Value> GetDevices();
  void CastMedia(const std::string& device_id,
                 const std::string& media_url,
                 gin::Arguments* args);
  void StopCasting(const std::string& session_id);

  // disable copy
  Cast(const Cast&) = delete;
  Cast& operator=(const Cast&) = delete;

 protected:
  explicit Cast(v8::Isolate* isolate);
  ~Cast() override;

 private:
  // Internal methods
  void OnDeviceDiscovered(const std::string& device_id,
                          const std::string& device_name,
                          const std::string& device_type);
  void OnDeviceLost(const std::string& device_id);
  void OnCastSessionStarted(const std::string& session_id,
                            const std::string& device_id);
  void OnCastSessionEnded(const std::string& session_id);
  void OnCastError(const std::string& error_message);

  bool discovery_active_ = false;
  std::vector<base::Value> discovered_devices_;
  
  base::WeakPtrFactory<Cast> weak_factory_{this};
};

}  // namespace electron::api

#endif  // ELECTRON_SHELL_BROWSER_API_ELECTRON_API_CAST_H_