package com.fixit.routing;

import com.fixit.user.AppUser;
import com.fixit.user.UserRepository;
import java.util.Optional;
import org.springframework.stereotype.Service;

/** Finds the least-busy staff member who handles this category in this block. */
@Service
public class RoutingService {

    private final StaffLoadQuery staffLoad;
    private final RoutingPolicy policy;
    private final UserRepository users;

    public RoutingService(StaffLoadQuery staffLoad, RoutingPolicy policy, UserRepository users) {
        this.staffLoad = staffLoad;
        this.policy = policy;
        this.users = users;
    }

    public Optional<AppUser> pickStaff(long hostelId, long categoryId, long blockId) {
        return policy.choose(staffLoad.eligibleStaff(hostelId, categoryId, blockId))
                .flatMap(users::findById);
    }
}
