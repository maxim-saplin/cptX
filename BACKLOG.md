## 1. When selecting code and asking to proceed the series (taking the first item as an example), the first item might be droped from the result

Sample Dart code, when  3 overrides are selected and cptX is asked to add faObserver to the remaining 2 overrides, the returned result has 2 overrides, didPush is ommited

```
  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPush(route, previousRoute);
    if (faObserver != null) {
      faObserver!.didPush(route, previousRoute);
      return;
    }
    if (routeFilter(route)) {
      _sendScreenView(route);
    }
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    super.didReplace(newRoute: newRoute, oldRoute: oldRoute);
    if (newRoute != null && routeFilter(newRoute)) {
      _sendScreenView(newRoute);
    }
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPop(route, previousRoute);
    if (previousRoute != null &&
        routeFilter(previousRoute) &&
        routeFilter(route)) {
      _sendScreenView(previousRoute);
    }
  }
  ```